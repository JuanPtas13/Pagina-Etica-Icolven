import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** false cuando faltan las variables de entorno: la app muestra una pantalla de configuración. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const SUPABASE_URL = url ?? '';
export const SUPABASE_ANON_KEY = anonKey ?? '';

/** Único cliente de Supabase de toda la aplicación. Solo usa la clave pública (anon). */
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Bucket privado existente. Nunca se usan URLs públicas: solo URLs firmadas. */
export const MEDIA_BUCKET = 'gabinete-media';
