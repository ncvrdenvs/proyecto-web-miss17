// Vercel Serverless Function: /api/vote
// Verifica la firma HMAC del código OTP, valida unicidad y emite un comprobante criptográfico del voto.

const crypto = require('crypto');
const {
  DISPOSABLE_DOMAINS,
  cleanRut,
  validateChileanRut,
  extractClientIp,
  verifySupabaseAccessToken,
  recordVoteInSupabase
} = require('./supabase-helper');

function maskRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 5) return '***';
  const dv = cleaned.slice(-1);
  const lastThree = cleaned.slice(-4, -1);
  return `**.***.${lastThree}-${dv}`;
}

function signOtpToken(rut, email, candidateId, otpCode, expiresAt) {
  const secret = process.env.OTP_SECRET || 'miss17-chimbarongo-2026-ultra-secret-key';
  const payload = `${cleanRut(rut)}|${email.toLowerCase().trim()}|${candidateId}|${otpCode}|${expiresAt}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const {
      authMethod = 'otp',
      rut,
      email,
      candidateId,
      otpCode,
      expiresAt,
      signature,
      googleAccessToken,
      fingerprint
    } = req.body || {};

    if (!rut || !candidateId) {
      return res.status(400).json({
        ok: false,
        code: 'MISSING_FIELDS',
        error: 'Faltan datos obligatorios para confirmar el voto.'
      });
    }

    if (!validateChileanRut(rut)) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_RUT',
        error: 'El RUT ingresado no es válido según la verificación oficial Módulo 11.'
      });
    }

    const clientIp = extractClientIp(req);
    let verifiedEmail = '';

    if (authMethod === 'google') {
      const authCheck = await verifySupabaseAccessToken(googleAccessToken);
      if (!authCheck.ok) {
        return res.status(401).json({
          ok: false,
          code: 'GOOGLE_AUTH_INVALID',
          error: authCheck.error
        });
      }
      verifiedEmail = authCheck.email;
      const domain = verifiedEmail.split('@')[1];
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        return res.status(403).json({
          ok: false,
          code: 'DISPOSABLE_EMAIL',
          error: 'No se permiten dominios de correo temporal.'
        });
      }
    } else {
      if (!email || !otpCode || !expiresAt || !signature) {
        return res.status(400).json({
          ok: false,
          code: 'MISSING_FIELDS',
          error: 'Faltan datos de verificación para confirmar el voto.'
        });
      }

      if (Date.now() > Number(expiresAt)) {
        return res.status(400).json({
          ok: false,
          code: 'OTP_EXPIRED',
          error: 'El código de confirmación ha expirado. Solicita uno nuevo.'
        });
      }

      verifiedEmail = String(email).toLowerCase().trim();
      const expectedSignature = signOtpToken(rut, verifiedEmail, candidateId, String(otpCode).trim(), expiresAt);
      if (expectedSignature !== signature) {
        return res.status(401).json({
          ok: false,
          code: 'INVALID_OTP',
          error: 'El código de 6 dígitos ingresado es incorrecto. Verifica e intenta nuevamente.'
        });
      }
    }

    // Generar hash de comprobante auditable
    const timestamp = new Date().toISOString();
    const receiptSeed = `${cleanRut(rut)}|${candidateId}|${fingerprint}|${timestamp}`;
    const receiptHash = 'M17-' + crypto.createHash('sha256').update(receiptSeed).digest('hex').slice(0, 10).toUpperCase();
    const rutHash = crypto.createHash('sha256').update(cleanRut(rut)).digest('hex').slice(0, 16);

    // Si Supabase está configurado, guardar el voto y actualizar el conteo atómicamente
    const dbSave = await recordVoteInSupabase({
      cleanRut: cleanRut(rut),
      maskedRut: maskRut(rut),
      email: verifiedEmail,
      candidateId,
      fingerprint,
      receiptId: receiptHash,
      ipAddress: clientIp
    });

    if (dbSave.isConfigured && !dbSave.success) {
      return res.status(400).json({
        ok: false,
        code: dbSave.code || 'VOTE_FAILED',
        error: dbSave.error || 'No fue posible registrar el voto en la base de datos.'
      });
    }

    return res.status(200).json({
      ok: true,
      receipt: {
        receiptId: receiptHash,
        candidateId,
        maskedRut: maskRut(rut),
        rutHash,
        authMethod,
        verifiedEmail,
        fingerprintShort: String(fingerprint || '').slice(0, 10).toUpperCase(),
        verifiedAt: timestamp,
        dbSynced: dbSave.isConfigured
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Error al registrar el voto verificado.'
    });
  }
};

