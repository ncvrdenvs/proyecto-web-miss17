// ============================================================================
// MISS 17 CHIMBARONGO 2026 — DATOS EDITORIALES, FOTOGRAFÍA Y RANKING EN VIVO
// ============================================================================

export const STORAGE_KEYS = {
  CANDIDATES: 'm17_chimbarongo_candidates_2026_v4',
  VOTED_RUTS: 'm17_chimbarongo_voted_ruts_2026_v4',
  VOTED_EMAILS: 'm17_chimbarongo_voted_emails_2026_v4',
  VOTED_DEVICES: 'm17_chimbarongo_voted_devices_2026_v4',
  AUDIT_LOGS: 'm17_chimbarongo_audit_logs_2026_v4',
  BLOCKED_COUNT: 'm17_chimbarongo_blocked_count_2026_v4'
};

// Fallback de alta costura en caso de desconexión total de internet
export function createEditorialPortrait(name, number, primaryColor = '#D50078', secondaryColor = '#32114F') {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1060" width="800" height="1060">
    <defs>
      <linearGradient id="g-${number}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="50%" stop-color="#5B2B88" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
      <radialGradient id="r-${number}" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#F2299B" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#140521" stop-opacity="0.95" />
      </radialGradient>
    </defs>
    <rect width="800" height="1060" fill="url(#g-${number})" />
    <rect width="800" height="1060" fill="url(#r-${number})" />
    <circle cx="400" cy="390" r="240" fill="none" stroke="#FBEAF5" stroke-opacity="0.2" stroke-width="1.5" />
    <circle cx="400" cy="390" r="190" fill="#FBEAF5" fill-opacity="0.06" />
    <text x="400" y="435" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-weight="900" font-size="140" text-anchor="middle" letter-spacing="8" opacity="0.92">${initials}</text>
    <text x="400" y="520" fill="#C89BDD" font-family="Montserrat, sans-serif" font-weight="700" font-size="22" text-anchor="middle" letter-spacing="10">MISS 17 CHIMBARONGO</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_CANDIDATES = [];

export const DYNAMIC_PODIUM_PHRASES = {
  top1: [
    'LA MÁS VOTADA DEL MOMENTO',
    'LIDERANDO EL RANKING DE POPULARIDAD',
    'FAVORITA #1 DEL PÚBLICO EN VIVO'
  ],
  top2: [
    'ENTRE LAS FAVORITAS DEL PÚBLICO',
    'A PASOS DE ALCANZAR EL TOP 1',
    'SEGUNDA MAYOR PREFERENCIA HOY'
  ],
  top3: [
    'ASÍ VA EL RANKING DE POPULARIDAD',
    'EN EL PODIO OFICIAL DE FAVORITAS',
    'SUBIENDO CON FUERZA EN LAS VOTACIONES'
  ]
};

export const INITIAL_AUDIT_LOGS = [];
