// ============================================================================
// MISS 17 CHIMBARONGO — SEGURIDAD INTERNA Y VALIDACIÓN MÓDULO 11
// Funciona de forma 100% invisible para el usuario final (fácil y rápido)
// ============================================================================

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'tempmail.com', 'temp-mail.org',
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'throwawaymail.com',
  'fakeinbox.com', 'sharklasers.com', 'getnada.com', 'maildrop.cc', 'trashmail.com',
  'dispostable.com', 'mailnesia.com', 'tempmailaddress.com', 'burnermail.io',
  'mohmal.com', 'emailondeck.com', 'crazymailing.com', 'mytemp.email'
]);

export function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

export function formatRut(value) {
  const cleaned = cleanRut(value);
  if (cleaned.length <= 1) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

export function calculateDv(bodyNumber) {
  const body = String(bodyNumber).replace(/\D/g, '');
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return '0';
  if (rest === 10) return 'K';
  return String(rest);
}

export function validateRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 8 || cleaned.length > 9) {
    return { valid: false, reason: 'Por favor ingresa un RUT válido (ej: 12.345.678-9).' };
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) {
    return { valid: false, reason: 'El RUT solo debe contener números y su dígito verificador.' };
  }

  // Bloqueo de patrones repetitivos o secuenciales de prueba (ej. 11.111.111-1)
  if (/^(\d)\1+$/.test(body) || body === '12345678' || body === '87654321') {
    return { valid: false, reason: 'Por favor ingresa un RUT real.' };
  }

  const numericBody = parseInt(body, 10);
  if (numericBody < 1000000 || numericBody > 45000000) {
    return { valid: false, reason: 'El RUT ingresado no corresponde a un rango válido.' };
  }

  const expectedDv = calculateDv(body);
  if (dv !== expectedDv) {
    return {
      valid: false,
      reason: 'El dígito verificador no coincide. Revisa el último número o letra de tu RUT.'
    };
  }

  return { valid: true, formatted: formatRut(cleaned), clean: cleaned };
}

export function generateRandomValidRut() {
  const randomBody = Math.floor(12500000 + Math.random() * 14000000);
  const dv = calculateDv(randomBody);
  return formatRut(`${randomBody}${dv}`);
}

export function maskRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 5) return '**.***.***-*';
  const dv = cleaned.slice(-1);
  const lastThree = cleaned.slice(-4, -1);
  return `**.***.${lastThree}-${dv}`;
}

export function validateEmailSecurity(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(normalized)) {
    return { valid: false, reason: 'Ingresa un correo electrónico válido (ej: nombre@gmail.com).' };
  }
  const domain = normalized.split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      isDisposable: true,
      reason: 'Por favor utiliza tu correo electrónico personal habitual para recibir tu código.'
    };
  }
  return { valid: true, email: normalized };
}

// Generador de Huella Digital para asegurar 1 voto por persona en el dispositivo
export async function generateDeviceFingerprint() {
  const components = [];

  try {
    components.push(navigator.userAgent || 'ua');
    components.push(navigator.language || 'es-CL');
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago');
    components.push(String(navigator.hardwareConcurrency || 4));
    components.push(String(navigator.maxTouchPoints || 0));

    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '15px Montserrat, Arial';
      ctx.fillStyle = '#D50078';
      ctx.fillRect(10, 5, 80, 24);
      ctx.fillStyle = '#32114F';
      ctx.fillText('Miss17-Chimbarongo', 14, 12);
      components.push(canvas.toDataURL().slice(-80));
    }
  } catch (e) {
    components.push('fallback-device');
  }

  const rawString = components.join('||');
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);

  if (window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `FP-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  }

  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    hash = (hash << 5) - hash + rawString.charCodeAt(i);
    hash |= 0;
  }
  return `FP-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

// Detección automática y silenciosa en segundo plano
export class BotShieldTelemetry {
  constructor() {
    this.reset();
    this._bindListeners();
  }

  reset() {
    this.openedAt = Date.now();
    this.mouseMoves = 0;
    this.touchEvents = 0;
    this.keyPresses = 0;
    // Habilitado automáticamente para no requerir interacción manual del usuario
    this.humanShieldVerified = true;
  }

  _bindListeners() {
    window.addEventListener('mousemove', () => {
      this.mouseMoves = Math.min(this.mouseMoves + 1, 500);
    }, { passive: true });

    window.addEventListener('touchstart', () => {
      this.touchEvents = Math.min(this.touchEvents + 1, 200);
    }, { passive: true });

    window.addEventListener('keydown', () => {
      this.keyPresses = Math.min(this.keyPresses + 1, 300);
    }, { passive: true });
  }

  evaluate(honeypotValue = '') {
    const timeSpentMs = Date.now() - this.openedAt;
    const isWebdriver = Boolean(navigator.webdriver);
    const hasHoneypot = Boolean(honeypotValue && String(honeypotValue).trim() !== '');

    if (hasHoneypot) {
      return {
        passed: false,
        code: 'AUTOMATION_DETECTED',
        reason: 'Se ha detectado una acción automatizada no permitida.'
      };
    }

    if (isWebdriver) {
      return {
        passed: false,
        code: 'AUTOMATION_DETECTED',
        reason: 'Por favor utiliza un navegador habitual en tu teléfono o computador para votar.'
      };
    }

    // Si tarda menos de 400ms es un bot por script
    if (timeSpentMs < 400) {
      return {
        passed: false,
        code: 'SUPERHUMAN_SPEED',
        reason: 'Por favor tómate un momento para revisar tus datos antes de enviar.'
      };
    }

    return {
      passed: true,
      telemetry: {
        timeSpentMs,
        webdriver: isWebdriver
      }
    };
  }
}
