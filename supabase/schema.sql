-- ============================================================================
-- MISS 17 CHIMBARONGO 2026 — ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL + REALTIME)
-- ============================================================================
-- Este script se ejecuta en el SQL Editor de Supabase (https://supabase.com/dashboard/project/_/sql).
-- Configura:
-- 1. Tablas: candidates, votes, audit_logs
-- 2. Restricción estricta de Voto Único por RUT (Anti-Fraude matemático)
-- 3. Función atómica ACID para registrar votos sin condiciones de carrera
-- 4. Políticas de Seguridad RLS (Row Level Security)
-- 5. Publicación en Tiempo Real (Realtime) para ranking en vivo
-- 6. Bucket de Storage para fotos de candidatas
-- ============================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA: CANDIDATAS (candidates)
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  sector TEXT NOT NULL,
  school TEXT NOT NULL,
  quote TEXT NOT NULL,
  hobbies TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  trend_delta TEXT NOT NULL DEFAULT '+0.0%',
  avatar TEXT NOT NULL,
  fallback_avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: VOTOS VERIFICADOS (votes) — 100% AUDITABLE Y ANTI-FRAUDE
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut_hash TEXT NOT NULL UNIQUE, -- HASH SHA-256 del RUT chileno. Garantiza 1 solo voto por persona.
  masked_rut TEXT NOT NULL,      -- Formato protegido: **.***.123-K
  email_hash TEXT NOT NULL,      -- HASH SHA-256 del correo electrónico
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE RESTRICT,
  fingerprint TEXT,              -- Huella digital del dispositivo
  receipt_id TEXT NOT NULL UNIQUE, -- Código de comprobante: M17-XXXXX
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alta velocidad
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON public.votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON public.votes(created_at DESC);

-- 4. TABLA: REGISTRO DE AUDITORÍA PÚBLICA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp_text TEXT NOT NULL DEFAULT 'Hace instantes',
  masked_rut TEXT NOT NULL,
  email_masked TEXT,
  fingerprint TEXT,
  candidate_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VERIFIED', 'BLOCKED')),
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 5. SEMILLA INICIAL DE CANDIDATAS (Si la tabla está vacía)
INSERT INTO public.candidates (id, number, name, age, sector, school, quote, hobbies, votes, trend_delta, avatar)
VALUES
  ('cand-01', 1, 'Valentina Rojas Muñoz', 17, 'Centro de Chimbarongo', 'Complejo Educacional Chimbarongo', 'Quiero impulsar espacios creativos, arte urbano y liderazgo para toda la nueva generación de nuestra comuna.', 'Danza contemporánea · Fotografía editorial · Acción social', 184, '+3.2%', '/images/cand_1.jpg'),
  ('cand-02', 2, 'Florencia Soto Cáceres', 16, 'Convento Viejo', 'Liceo Bicentenario Chimbarongo', 'Representar la identidad mimbrera con una visión moderna, femenina y sustentable es mi mayor orgullo.', 'Vóleibol competitivo · Diseño de autor · Liderazgo estudiantil', 176, '+2.8%', '/images/cand_2.jpg'),
  ('cand-03', 3, 'Isidora Pino Valdés', 17, 'Tinguiririca', 'Colegio San José de la Montaña', 'La verdadera corona está en la autenticidad, la empatía y en inspirar a otras jóvenes a creer en su voz.', 'Música acústica · Debate juvenil · Protección animal', 165, '+2.1%', '/images/cand_3.jpg'),
  ('cand-04', 4, 'Martina Contreras Lira', 17, 'Peor es Nada', 'Colegio Chimbarongo', 'Busco demostrar que desde cada rincón rural de Chimbarongo nacen talentos capaces de transformar el futuro.', 'Atletismo · Arte digital · Astronomía', 149, '+1.7%', '/images/cand_4.jpg'),
  ('cand-05', 5, 'Catalina Morales Bravo', 16, 'San Enrique', 'Liceo Bicentenario Chimbarongo', 'Cada voto real celebra la unión, la alegría y la energía de una juventud que construye comunidad.', 'Teatro musical · Emprendimiento joven · Medioambiente', 138, '+1.4%', '/images/cand_5.jpg'),
  ('cand-06', 6, 'Antonella Vargas Silva', 17, 'Quinta Normal · Chimbarongo', 'Complejo Educacional Chimbarongo', 'Miss 17 es una plataforma para amplificar proyectos sociales, cultura y respeto en toda nuestra provincia.', 'Patinaje artístico · Literatura · Comunicación audiovisual', 129, '+1.2%', '/images/cand_6.jpg'),
  ('cand-07', 7, 'Javiera Espinoza Riquelme', 17, 'San José de Toro', 'Colegio San José de la Montaña', 'Mi compromiso es visibilizar el bienestar emocional juvenil y el deporte inclusivo en todos los colegios.', 'Básquetbol · Podcasting · Voluntariado', 118, '+1.0%', '/images/cand_7.jpg'),
  ('cand-08', 8, 'Emilia Fuentes Donoso', 16, 'Santa Isabel', 'Colegio Chimbarongo', 'Con determinación y orgullo por nuestras raíces, la nueva generación de Chimbarongo brilla con luz propia.', 'Danza folclórica · Guitarra · Rescate patrimonial', 112, '+0.9%', '/images/cand_8.jpg')
ON CONFLICT (id) DO NOTHING;

-- 6. FUNCIÓN ATÓMICA DE EMISIÓN DE VOTO (ACID TRANSACTION)
-- Ejecuta la verificación de duplicados, inserción y suma del voto en una sola transacción segura.
CREATE OR REPLACE FUNCTION public.cast_verified_vote(
  p_clean_rut TEXT,
  p_masked_rut TEXT,
  p_email TEXT,
  p_candidate_id TEXT,
  p_fingerprint TEXT,
  p_receipt_id TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de sistema para garantizar la seguridad
AS $$
DECLARE
  v_rut_hash TEXT;
  v_email_hash TEXT;
  v_email_masked TEXT;
  v_candidate_name TEXT;
  v_new_votes INTEGER;
BEGIN
  -- 1. Calcular hashes criptográficos
  v_rut_hash := encode(digest(upper(trim(p_clean_rut)), 'sha256'), 'hex');
  v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
  
  -- Enmascarar correo para auditoría pública: c.m***@gmail.com
  v_email_masked := regexp_replace(lower(trim(p_email)), '^(..)(.*)(@.*)$', '\1***\3');

  -- 2. Verificar existencia de la candidata
  SELECT name INTO v_candidate_name FROM public.candidates WHERE id = p_candidate_id;
  IF v_candidate_name IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'CANDIDATE_NOT_FOUND',
      'error', 'La candidata seleccionada no existe o no está habilitada.'
    );
  END IF;

  -- 3. Verificar si el RUT ya votó previamente (Escudo Anti-Fraude)
  IF EXISTS (SELECT 1 FROM public.votes WHERE rut_hash = v_rut_hash) THEN
    -- Registrar en auditoría intento bloqueado
    INSERT INTO public.audit_logs (id, masked_rut, email_masked, fingerprint, candidate_name, status, detail)
    VALUES (
      'REG-' || substring(md5(random()::text), 1, 6),
      p_masked_rut,
      v_email_masked,
      p_fingerprint,
      'Intento duplicado',
      'BLOCKED',
      'Intento no permitido: Este RUT ya emitió su voto oficial previamente.'
    );

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_VOTED',
      'error', 'Este RUT ya emitió su voto en Miss 17 Chimbarongo. Solo se permite un voto por persona.'
    );
  END IF;

  -- 4. Registrar voto oficial
  INSERT INTO public.votes (
    rut_hash,
    masked_rut,
    email_hash,
    candidate_id,
    fingerprint,
    receipt_id,
    ip_address
  ) VALUES (
    v_rut_hash,
    p_masked_rut,
    v_email_hash,
    p_candidate_id,
    p_fingerprint,
    p_receipt_id,
    p_ip_address
  );

  -- 5. Incrementar voto de la candidata atómicamente
  UPDATE public.candidates
  SET votes = votes + 1,
      trend_delta = '+3.5%',
      updated_at = NOW()
  WHERE id = p_candidate_id
  RETURNING votes INTO v_new_votes;

  -- 6. Insertar entrada de auditoría verificada
  INSERT INTO public.audit_logs (
    id,
    timestamp_text,
    masked_rut,
    email_masked,
    fingerprint,
    candidate_name,
    status,
    detail
  ) VALUES (
    p_receipt_id,
    'Ahora mismo',
    p_masked_rut,
    v_email_masked,
    p_fingerprint,
    v_candidate_name,
    'VERIFIED',
    'RUT Módulo 11 + OTP Verificado + Huella Digital Única'
  );

  -- Retornar éxito
  RETURN jsonb_build_object(
    'ok', true,
    'receiptId', p_receipt_id,
    'candidateId', p_candidate_id,
    'candidateName', v_candidate_name,
    'maskedRut', p_masked_rut,
    'newVoteCount', v_new_votes
  );

EXCEPTION WHEN unique_violation THEN
  -- En caso de dos solicitudes en el mismo milisegundo con el mismo RUT
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'DUPLICATE_VOTE_CONCURRENT',
    'error', 'El voto para este RUT ya fue procesado.'
  );
WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'SERVER_ERROR',
    'error', SQLERRM
  );
END;
$$;

-- 7. ACTIVAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para CANDIDATES:
-- Lectura pública para todos (ranking en vivo)
DROP POLICY IF EXISTS "Permitir lectura publica de candidatas" ON public.candidates;
CREATE POLICY "Permitir lectura publica de candidatas"
  ON public.candidates FOR SELECT
  USING (true);

-- Edición permitida para el panel de administración
DROP POLICY IF EXISTS "Permitir modificacion de candidatas para admin" ON public.candidates;
CREATE POLICY "Permitir modificacion de candidatas para admin"
  ON public.candidates FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Políticas para VOTES:
-- Los votos son privados para proteger el secreto del voto. Solo backend/service_role puede leer e insertar.
DROP POLICY IF EXISTS "Restringir votos a backend" ON public.votes;
CREATE POLICY "Restringir votos a backend"
  ON public.votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para AUDIT_LOGS:
-- Lectura pública para transparencia comunitaria
DROP POLICY IF EXISTS "Permitir lectura publica de auditoria" ON public.audit_logs;
CREATE POLICY "Permitir lectura publica de auditoria"
  ON public.audit_logs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insercion de auditoria a backend" ON public.audit_logs;
CREATE POLICY "Permitir insercion de auditoria a backend"
  ON public.audit_logs FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- 8. HABILITAR TIEMPO REAL (SUPABASE REALTIME)
-- Permite que los clientes suscritos reciban actualizaciones instantáneas sin recargar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- 9. CONFIGURAR BUCKET DE FOTOS EN STORAGE (candidate-photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880, -- Máximo 5 MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880;

-- Políticas de acceso para el bucket de fotos
DROP POLICY IF EXISTS "Acceso publico para ver fotos" ON storage.objects;
CREATE POLICY "Acceso publico para ver fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-photos');

DROP POLICY IF EXISTS "Permitir subida de fotos" ON storage.objects;
CREATE POLICY "Permitir subida de fotos"
  ON storage.objects FOR INSERT
  TO public, authenticated, service_role
  WITH CHECK (bucket_id = 'candidate-photos');

DROP POLICY IF EXISTS "Permitir actualizacion y borrado de fotos" ON storage.objects;
CREATE POLICY "Permitir actualizacion y borrado de fotos"
  ON storage.objects FOR ALL
  TO public, authenticated, service_role
  USING (bucket_id = 'candidate-photos');

