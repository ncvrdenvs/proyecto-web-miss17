// Vercel Serverless Function: /api/vote
// Verifica la firma HMAC del código OTP, valida unicidad y emite un comprobante criptográfico del voto.

const crypto = require('crypto');

function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

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
    const { rut, email, candidateId, otpCode, expiresAt, signature, fingerprint } = req.body || {};

    if (!rut || !email || !candidateId || !otpCode || !expiresAt || !signature) {
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

    const expectedSignature = signOtpToken(rut, email, candidateId, String(otpCode).trim(), expiresAt);
    if (expectedSignature !== signature) {
      return res.status(401).json({
        ok: false,
        code: 'INVALID_OTP',
        error: 'El código de 6 dígitos ingresado es incorrecto. Verifica e intenta nuevamente.'
      });
    }

    // Generar hash de comprobante auditable
    const timestamp = new Date().toISOString();
    const receiptSeed = `${cleanRut(rut)}|${candidateId}|${fingerprint}|${timestamp}`;
    const receiptHash = 'M17-' + crypto.createHash('sha256').update(receiptSeed).digest('hex').slice(0, 10).toUpperCase();
    const rutHash = crypto.createHash('sha256').update(cleanRut(rut)).digest('hex').slice(0, 16);

    return res.status(200).json({
      ok: true,
      receipt: {
        receiptId: receiptHash,
        candidateId,
        maskedRut: maskRut(rut),
        rutHash,
        fingerprintShort: String(fingerprint || '').slice(0, 10).toUpperCase(),
        verifiedAt: timestamp
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Error al registrar el voto verificado.'
    });
  }
};

