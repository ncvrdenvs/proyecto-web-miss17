// Helper de integración con Supabase REST API (Compatible con Node 18+ y Vercel Serverless)
// Funciona de forma nativa sin requerir dependencias externas pesadas.

const crypto = require('crypto');

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
  getSupabaseConfig,
  computeSha256,
  checkRutAlreadyVoted,
  checkEmailAlreadyVoted,
  recordVoteInSupabase
};

