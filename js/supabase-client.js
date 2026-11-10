// ============================================================================
// MISS 17 CHIMBARONGO 2026 — CLIENTE OFICIAL SUPABASE (POSTGRESQL & REALTIME)
// ============================================================================
// Soporta conexión automática vía Vercel Environment (/api/config) o configuración manual en Admin.
// Importa el SDK oficial de Supabase vía ESM sin necesidad de empaquetadores locales.

const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const STORAGE_CONFIG_KEY = 'm17_supabase_custom_credentials_v1';

let supabaseInstance = null;
let cachedConfig = null;

/**
 * Obtiene la configuración de Supabase desde /api/config o desde localStorage.
 */
export async function getSupabaseConfig() {
  if (cachedConfig) return cachedConfig;

  // 1. Intentar obtener desde variables de entorno del servidor (/api/config)
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.configured && data.supabaseUrl && data.supabaseAnonKey) {
        cachedConfig = {
          url: data.supabaseUrl.replace(/\/$/, ''),
          anonKey: data.supabaseAnonKey,
          source: 'ENVIRONMENT'
        };
        return cachedConfig;
      }
    }
  } catch (err) {
    // Si estamos en entorno estático sin servidor
  }

  // 2. Intentar obtener desde configuración guardada por el administrador en localStorage
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        cachedConfig = {
          url: parsed.url.replace(/\/$/, ''),
          anonKey: parsed.anonKey,
          source: 'LOCAL_CONFIG'
        };
        return cachedConfig;
      }
    }
  } catch {}

  cachedConfig = { url: null, anonKey: null, source: 'NONE' };
  return cachedConfig;
}

/**
 * Guarda credenciales manuales de Supabase (desde el panel de administración).
 */
export function saveManualSupabaseConfig(url, anonKey) {
  if (!url || !anonKey) {
    localStorage.removeItem(STORAGE_CONFIG_KEY);
    cachedConfig = null;
    supabaseInstance = null;
    return false;
  }

  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();

  localStorage.setItem(
    STORAGE_CONFIG_KEY,
    JSON.stringify({ url: cleanUrl, anonKey: cleanKey, savedAt: new Date().toISOString() })
  );

  cachedConfig = { url: cleanUrl, anonKey: cleanKey, source: 'LOCAL_CONFIG' };
  supabaseInstance = null;
  return true;
}

/**
 * Inicializa y retorna el cliente Supabase.
 */
export async function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const config = await getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    const { createClient } = await import(SUPABASE_CDN_URL);
    supabaseInstance = createClient(config.url, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Error al cargar SDK desde CDN:', err);
    return null;
  }
}

/**
 * Obtiene la lista completa de candidatas desde Supabase (o null si no está conectado).
 */
export async function fetchCandidatesFromDb() {
  const supabase = await getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('number', { ascending: true });

    if (error) {
      console.warn('[Supabase] Error al consultar candidatas:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Normalizar a formato camelCase compatible con la aplicación
    return data.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      age: c.age,
      sector: c.sector,
      school: c.school,
      quote: c.quote,
      hobbies: c.hobbies,
      votes: c.votes,
      trendDelta: c.trend_delta || '+0.0%',
      avatar: c.avatar,
      fallbackAvatar: c.fallback_avatar || null
    }));
  } catch (err) {
    console.warn('[Supabase] Error de red al consultar candidatas:', err);
    return null;
  }
}

/**
 * Actualiza la información personal de una participante en la base de datos (LOS VOTOS NUNCA SE EDITAN).
 */
export async function updateCandidateInDb(cand) {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, offline: true };

  try {
    const { data, error } = await supabase
      .from('candidates')
      .update({
        name: cand.name,
        age: cand.age,
        sector: cand.sector,
        school: cand.school,
        quote: cand.quote,
        hobbies: cand.hobbies,
        avatar: cand.avatar,
        updated_at: new Date().toISOString()
      })
      .eq('id', cand.id)
      .select();

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error('[Supabase] Error al actualizar participante:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Inserta una nueva participante en la base de datos (con 0 votos iniciales).
 */
export async function insertCandidateInDb(cand) {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, offline: true };

  try {
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        id: cand.id,
        number: cand.number,
        name: cand.name,
        age: cand.age,
        sector: cand.sector,
        school: cand.school,
        quote: cand.quote,
        hobbies: cand.hobbies,
        votes: 0,
        trend_delta: '+0.0%',
        avatar: cand.avatar,
        fallback_avatar: cand.fallbackAvatar || null
      })
      .select();

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error('[Supabase] Error al insertar participante:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Elimina una participante de la base de datos.
 */
export async function deleteCandidateFromDb(candId) {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, offline: true };

  try {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candId);

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('[Supabase] Error al eliminar participante:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sube una fotografía al Bucket 'candidate-photos' de Supabase Storage y retorna la URL pública.
 */
export async function uploadCandidatePhotoToStorage(fileOrBlob, candidateId) {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, offline: true };

  try {
    const fileExt = fileOrBlob.type === 'image/png' ? 'png' : fileOrBlob.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `cand_${candidateId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Subir archivo al bucket candidate-photos
    const { data, error } = await supabase.storage
      .from('candidate-photos')
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    // Obtener la URL pública oficial de la foto
    const { data: publicUrlData } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(filePath);

    return {
      ok: true,
      publicUrl: publicUrlData.publicUrl,
      fileName
    };
  } catch (err) {
    console.error('[Supabase] Error al subir foto a Storage:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene los registros de auditoría más recientes desde Supabase.
 */
export async function fetchAuditLogsFromDb(limit = 40) {
  const supabase = await getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return null;

    return data.map((log) => ({
      id: log.id,
      timestamp: log.timestamp_text || 'Hace instantes',
      maskedRut: log.masked_rut,
      email: log.email_masked || 'privado',
      fingerprint: log.fingerprint || 'FP-VERIFIED',
      candidateName: log.candidate_name,
      status: log.status,
      detail: log.detail
    }));
  } catch {
    return null;
  }
}

/**
 * Suscribe la página a cambios en tiempo real en la tabla de candidatas.
 * Cuando alguien vota o el admin edita una foto, ejecuta la función callback instantáneamente.
 */
export async function subscribeToCandidatesRealtime(onCandidateUpdate) {
  const supabase = await getSupabase();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('realtime_candidates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidates' },
        (payload) => {
          if (typeof onCandidateUpdate === 'function') {
            onCandidateUpdate(payload);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('[Supabase Realtime] No se pudo conectar al canal en vivo:', err);
    return null;
  }
}

