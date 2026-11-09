// ============================================================================
// MISS 17 CHIMBARONGO 2026 — DATOS EDITORIALES, FOTOGRAFÍA Y RANKING EN VIVO
// ============================================================================

export const STORAGE_KEYS = {
  CANDIDATES: 'm17_chimbarongo_candidates_2026_v3',
  VOTED_RUTS: 'm17_chimbarongo_voted_ruts_2026_v3',
  VOTED_EMAILS: 'm17_chimbarongo_voted_emails_2026_v3',
  VOTED_DEVICES: 'm17_chimbarongo_voted_devices_2026_v3',
  AUDIT_LOGS: 'm17_chimbarongo_audit_logs_2026_v3',
  BLOCKED_COUNT: 'm17_chimbarongo_blocked_count_2026_v3'
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

export const INITIAL_CANDIDATES = [
  {
    id: 'cand-01',
    number: 1,
    name: 'Valentina Rojas Muñoz',
    age: 17,
    sector: 'Centro de Chimbarongo',
    school: 'Complejo Educacional Chimbarongo',
    quote: 'Quiero impulsar espacios creativos, arte urbano y liderazgo para toda la nueva generación de nuestra comuna.',
    hobbies: 'Danza contemporánea · Fotografía editorial · Acción social',
    votes: 184,
    trendDelta: '+3.2%',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Valentina Rojas', 1, '#D50078', '#32114F')
  },
  {
    id: 'cand-02',
    number: 2,
    name: 'Florencia Soto Cáceres',
    age: 16,
    sector: 'Convento Viejo',
    school: 'Liceo Bicentenario Chimbarongo',
    quote: 'Representar la identidad mimbrera con una visión moderna, femenina y sustentable es mi mayor orgullo.',
    hobbies: 'Vóleibol competitivo · Diseño de autor · Liderazgo estudiantil',
    votes: 176,
    trendDelta: '+2.8%',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Florencia Soto', 2, '#F2299B', '#32114F')
  },
  {
    id: 'cand-03',
    number: 3,
    name: 'Isidora Pino Valdés',
    age: 17,
    sector: 'Tinguiririca',
    school: 'Colegio San José de la Montaña',
    quote: 'La verdadera corona está en la autenticidad, la empatía y en inspirar a otras jóvenes a creer en su voz.',
    hobbies: 'Música acústica · Debate juvenil · Protección animal',
    votes: 165,
    trendDelta: '+2.1%',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Isidora Pino', 3, '#5B2B88', '#D50078')
  },
  {
    id: 'cand-04',
    number: 4,
    name: 'Martina Contreras Lira',
    age: 17,
    sector: 'Peor es Nada',
    school: 'Colegio Chimbarongo',
    quote: 'Busco demostrar que desde cada rincón rural de Chimbarongo nacen talentos capaces de transformar el futuro.',
    hobbies: 'Atletismo · Arte digital · Astronomía',
    votes: 149,
    trendDelta: '+1.7%',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Martina Contreras', 4, '#D50078', '#5B2B88')
  },
  {
    id: 'cand-05',
    number: 5,
    name: 'Catalina Morales Bravo',
    age: 16,
    sector: 'San Enrique',
    school: 'Liceo Bicentenario Chimbarongo',
    quote: 'Cada voto real celebra la unión, la alegría y la energía de una juventud que construye comunidad.',
    hobbies: 'Teatro musical · Emprendimiento joven · Medioambiente',
    votes: 138,
    trendDelta: '+1.4%',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Catalina Morales', 5, '#5B2B88', '#F2299B')
  },
  {
    id: 'cand-06',
    number: 6,
    name: 'Antonella Vargas Silva',
    age: 17,
    sector: 'Quinta Normal · Chimbarongo',
    school: 'Complejo Educacional Chimbarongo',
    quote: 'Miss 17 es una plataforma para amplificar proyectos sociales, cultura y respeto en toda nuestra provincia.',
    hobbies: 'Patinaje artístico · Literatura · Comunicación audiovisual',
    votes: 129,
    trendDelta: '+1.2%',
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Antonella Vargas', 6, '#F2299B', '#5B2B88')
  },
  {
    id: 'cand-07',
    number: 7,
    name: 'Javiera Espinoza Riquelme',
    age: 17,
    sector: 'San José de Toro',
    school: 'Colegio San José de la Montaña',
    quote: 'Mi compromiso es visibilizar el bienestar emocional juvenil y el deporte inclusivo en todos los colegios.',
    hobbies: 'Básquetbol · Podcasting · Voluntariado',
    votes: 118,
    trendDelta: '+1.0%',
    avatar: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Javiera Espinoza', 7, '#32114F', '#D50078')
  },
  {
    id: 'cand-08',
    number: 8,
    name: 'Emilia Fuentes Donoso',
    age: 16,
    sector: 'Santa Isabel',
    school: 'Colegio Chimbarongo',
    quote: 'Con determinación y orgullo por nuestras raíces, la nueva generación de Chimbarongo brilla con luz propia.',
    hobbies: 'Danza folclórica · Guitarra · Rescate patrimonial',
    votes: 112,
    trendDelta: '+0.9%',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85',
    fallbackAvatar: createEditorialPortrait('Emilia Fuentes', 8, '#D50078', '#F2299B')
  }
];

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

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'M17-89A4F21C',
    timestamp: 'Hace instantes',
    maskedRut: '**.***.482-K',
    email: 'c.m***@gmail.com',
    fingerprint: 'FP-9B2E-41C0-88A1',
    candidateName: 'Valentina Rojas Muñoz',
    status: 'VERIFIED',
    detail: 'RUT Módulo 11 + OTP 6 dígitos + Huella única'
  },
  {
    id: 'M17-34D9E10B',
    timestamp: 'Hace 1 min',
    maskedRut: '**.***.910-4',
    email: 'f.s***@outlook.cl',
    fingerprint: 'FP-3D1A-77F4-12C9',
    candidateName: 'Florencia Soto Cáceres',
    status: 'VERIFIED',
    detail: 'RUT Módulo 11 + OTP 6 dígitos + Huella única'
  },
  {
    id: 'M17-902B81',
    timestamp: 'Hace 2 min',
    maskedRut: '**.***.111-1',
    email: 'contacto***@correo.cl',
    fingerprint: 'FP-A001-9910',
    candidateName: 'Intento duplicado',
    status: 'BLOCKED',
    detail: 'Intento no permitido: RUT ya registrado anteriormente'
  },
  {
    id: 'M17-71C2B08F',
    timestamp: 'Hace 3 min',
    maskedRut: '**.***.205-7',
    email: 'm.p***@gmail.com',
    fingerprint: 'FP-6E4C-90B2-55D1',
    candidateName: 'Isidora Pino Valdés',
    status: 'VERIFIED',
    detail: 'RUT Módulo 11 + OTP 6 dígitos + Huella única'
  }
];
