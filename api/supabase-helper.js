// Helper de integración con Supabase REST API (Compatible con Node 18+ y Vercel Serverless)
// Funciona de forma nativa sin requerir dependencias externas pesadas.

const crypto = require('crypto');

const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'throwawaymail.com', 'temp-mail.org', 'fakeinbox.com',
  'sharklasers.com', 'getnada.com', 'maildrop.cc', 'trashmail.com', 'dispostable.com'
]);

function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

function validateChileanRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 8 || cleaned.length > 9) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  if (/^(\d)\1+$/.test(body) || body === '12345678' || body === '87654321') {
    return false;
  }

  const numRut = parseInt(body, 10);
  if (numRut < 1000000 || numRut > 50000000) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedRest = 11 - (sum % 11);
  const expectedDv = expectedRest === 11 ? '0' : expectedRest === 10 ? 'K' : String(expectedRest);

  return dv === expectedDv;
}

/**
 * Verifica un Access Token JWT de Supabase Auth (Google OAuth) y retorna el correo verificado.
 */
async function verifySupabaseAccessToken(accessToken) {
  const { isConfigured, url, key } = getSupabaseConfig();
  if (!isConfigured || !accessToken) {
    return { ok: false, error: 'Autenticación con Google no disponible o token faltante.' };
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      return { ok: false, error: 'La sesión de Google expiró o no es válida. Vuelve a iniciar sesión con Google.' };
    }

    const user = await res.json();
    const email = String(user?.email || '').toLowerCase().trim();
    const emailVerified = Boolean(user?.email_confirmed_at || user?.user_metadata?.email_verified);
    if (!email || !emailVerified) {
      return { ok: false, error: 'Tu cuenta de Google no tiene un correo verificado.' };
    }

    return { ok: true, email, userId: user.id };
  } catch (err) {
    console.error('[Supabase Auth] Error al verificar token Google:', err.message);
    return { ok: false, error: 'No se pudo verificar la cuenta de Google con Supabase.' };
  }
}

/**
 * Extrae la IP cliente real desde los headers de Vercel/proxy.
 */
function extractClientIp(req) {
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd) {
    return String(fwd).split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || null;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;
  return {
    isConfigured: Boolean(url && key),
    url: url ? url.replace(/\/$/, '') : null,
    key
  };
}

function computeSha256(str) {
  return crypto.createHash('sha256').update(String(str || '')).digest('hex');
}

async function checkVoteEligibilityRpc(payload) {
  const { isConfigured, url, key } = getSupabaseConfig();
  if (!isConfigured) return null;

  try {
    const endpoint = `${url}/rest/v1/rpc/check_vote_eligibility`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Supabase] Error en check_vote_eligibility:', err.message);
    return null;
  }
}

async function checkVoteHashExists(column, rawValue) {
  const { isConfigured, url, key } = getSupabaseConfig();
  if (!isConfigured) return false;

  try {
    const hash = computeSha256(rawValue);
    const endpoint = `${url}/rest/v1/votes?${column}=eq.${hash}&select=id`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.warn(`[Supabase] Error al consultar ${column}:`, err.message);
    return false;
  }
}

/**
 * Consulta a Supabase si un RUT ya tiene un voto registrado en la base de datos.
 */
async function checkRutAlreadyVoted(cleanRut) {
  const normalizedRut = String(cleanRut || '').toUpperCase().trim();
  const rpcResult = await checkVoteEligibilityRpc({ p_clean_rut: normalizedRut, p_email: null });
  if (rpcResult && typeof rpcResult.rutVoted === 'boolean') {
    return rpcResult.rutVoted;
  }
  return checkVoteHashExists('rut_hash', normalizedRut);
}

/**
 * Consulta a Supabase si un correo electrónico ya fue utilizado para emitir un voto.
 */
async function checkEmailAlreadyVoted(email) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const rpcResult = await checkVoteEligibilityRpc({ p_clean_rut: null, p_email: normalizedEmail });
  if (rpcResult && typeof rpcResult.emailVoted === 'boolean') {
    return rpcResult.emailVoted;
  }
  return checkVoteHashExists('email_hash', normalizedEmail);
}

/**
 * Ejecuta la función RPC atómica cast_verified_vote en Supabase.
 */
async function recordVoteInSupabase({
  cleanRut,
  maskedRut,
  email,
  candidateId,
  fingerprint,
  receiptId,
  ipAddress
}) {
  const { isConfigured, url, key } = getSupabaseConfig();
  if (!isConfigured) {
    return { isConfigured: false };
  }

  try {
    const endpoint = `${url}/rest/v1/rpc/cast_verified_vote`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_clean_rut: cleanRut,
        p_masked_rut: maskedRut,
        p_email: email,
        p_candidate_id: candidateId,
        p_fingerprint: fingerprint || 'DESCONOCIDO',
        p_receipt_id: receiptId,
        p_ip_address: ipAddress || null
      })
    });

    const result = await res.json();
    return {
      isConfigured: true,
      success: res.ok && result && result.ok === true,
      data: result,
      error: !res.ok ? (result.message || 'Error en base de datos Supabase') : (!result.ok ? result.error : null),
      code: result?.code
    };
  } catch (err) {
    console.error('[Supabase] Error al ejecutar RPC:', err);
    return {
      isConfigured: true,
      success: false,
      error: 'Error de conexión con la base de datos de votos.'
    };
  }
}

module.exports = {
  DISPOSABLE_DOMAINS,
  cleanRut,
  validateChileanRut,
  extractClientIp,
  getSupabaseConfig,
  computeSha256,
  checkRutAlreadyVoted,
  checkEmailAlreadyVoted,
  verifySupabaseAccessToken,
  recordVoteInSupabase
};

