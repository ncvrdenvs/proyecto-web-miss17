// Vercel Serverless Function: /api/send-otp
// Valida RUT chileno (Módulo 11), correo no desechable, huella de dispositivo y genera código OTP de 6 dígitos.
// En producción en Vercel, si existe process.env.RESEND_API_KEY, envía el correo real automáticamente.

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

  // Bloquear patrones repetitivos falsos como 11111111, 22222222, 12345678
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
    const { rut, email, phone, candidateId, candidateName, fingerprint, telemetry, honeypot } = req.body || {};

    // 1. Trampa Honeypot anti-bots
    if (honeypot && String(honeypot).trim() !== '') {
      return res.status(403).json({
        ok: false,
        code: 'BOT_HONEYPOT',
        error: 'Detección de seguridad: Actividad automatizada bloqueada (Honeypot).'
      });
    }

    // 2. Verificación de telemetría humana
    if (telemetry) {
      if (telemetry.webdriver) {
        return res.status(403).json({
          ok: false,
          code: 'BOT_WEBDRIVER',
          error: 'Navegador automatizado detectado. Por seguridad solo se permiten votos humanos directos.'
        });
      }
      if (typeof telemetry.timeSpentMs === 'number' && telemetry.timeSpentMs < 1400) {
        return res.status(403).json({
          ok: false,
          code: 'BOT_SPEED',
          error: 'Formulario completado a velocidad no humana. Intento bloqueado por el escudo Anti-Bot.'
        });
      }
    }

    // 3. Validación estricta de RUT chileno (Módulo 11)
    if (!validateChileanRut(rut)) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_RUT',
        error: 'El RUT ingresado no es válido según la verificación oficial Módulo 11.'
      });
    }

    // 4. Validación de correo electrónico y bloqueo de correos temporales
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_EMAIL',
        error: 'Ingresa un correo electrónico válido para recibir tu código de confirmación.'
      });
    }

    const domain = normalizedEmail.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return res.status(403).json({
        ok: false,
        code: 'DISPOSABLE_EMAIL',
        error: `El dominio @${domain} corresponde a un servicio de correo temporal no permitido. Usa tu correo personal.`
      });
    }

    if (!fingerprint || String(fingerprint).length < 8) {
      return res.status(400).json({
        ok: false,
        code: 'MISSING_FINGERPRINT',
        error: 'No se pudo verificar la firma de seguridad del dispositivo.'
      });
    }

    // Generar código OTP de 6 dígitos y firma HMAC sin estado (compatible con Vercel Serverless)
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minutos
    const signature = signOtpToken(rut, normalizedEmail, candidateId, otpCode, expiresAt);

    let emailSentLive = false;

    // Si en Vercel está configurada RESEND_API_KEY, enviamos el correo real
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Miss 17 Chimbarongo <votaciones@miss17chimbarongo.cl>',
            to: [normalizedEmail],
            subject: `Código de verificación ${otpCode} - Votación Miss 17 Chimbarongo`,
            html: `
              <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FBEAF5; padding: 32px; border-radius: 20px; color: #32114F;">
                <h2 style="color: #5B2B88; text-transform: uppercase; margin-top: 0;">Miss 17 Chimbarongo</h2>
                <p>Estás a un paso de confirmar tu voto oficial para <strong>${candidateName || 'tu candidata favorita'}</strong>.</p>
                <div style="background: #FFFFFF; border: 2px solid #D50078; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #5B2B88; display: block; margin-bottom: 6px;">Tu Código de Confirmación</span>
                  <strong style="font-size: 34px; letter-spacing: 8px; color: #D50078;">${otpCode}</strong>
                </div>
                <p style="font-size: 13px; color: #5B2B88;">Este código expira en 3 minutos y garantiza que cada voto sea 100% real y único.</p>
              </div>
            `
          })
        });
        emailSentLive = resendRes.ok;
      } catch (e) {
        emailSentLive = false;
      }
    }

    return res.status(200).json({
      ok: true,
      expiresAt,
      signature,
      emailSentLive,
      // En modo diseño/pruebas (cuando aún no se configura RESEND_API_KEY en Vercel), devolvemos demoOtp para pruebas inmediatas
      demoOtp: emailSentLive ? undefined : otpCode,
      message: emailSentLive
        ? `Código enviado a ${normalizedEmail}`
        : `Código generado para ${normalizedEmail} (Modo Prueba Activo)`
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Error interno al procesar la solicitud de verificación.'
    });
  }
};

