import { MEDIA_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';
import { toAppError, AppError } from '../lib/errors';
import { fileExtension } from '../utils/media';
import { slugify } from '../utils/format';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // renovar 5 minutos antes de expirar

interface CacheEntry {
  url: string;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

/**
 * Devuelve una URL firmada temporal para una ruta del bucket privado.
 * `storage_path` es una ruta dentro del bucket, NO una URL completa.
 * La URL firmada es temporal y no garantiza revocación inmediata mientras siga vigente.
 */
export async function getSignedUrl(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit && hit.expiresAt - Date.now() > REFRESH_MARGIN_MS) return hit.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw toAppError(error ?? { message: 'Object not found' }, 'No se pudo cargar el archivo.');
    cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 });
    return data.signedUrl;
  })();
  inflight.set(path, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(path);
  }
}

export function invalidateSignedUrl(path: string): void {
  cache.delete(path);
}

export function clearSignedUrlCache(): void {
  cache.clear();
}

/** Construye la ruta exigida por las políticas: `<UUID>/<archivo>` (UUID de publicación o de proyecto). */
export function buildStoragePath(ownerUuid: string, originalName: string, mime: string, prefix?: string): string {
  const ext = fileExtension(originalName, mime);
  const base = slugify(originalName.replace(/\.[^.]+$/, '')) || 'archivo';
  const unique = crypto.randomUUID().slice(0, 8);
  return `${ownerUuid}/${prefix ? `${prefix}-` : ''}${base}-${unique}.${ext}`;
}

/**
 * Sube un archivo al bucket privado con progreso real (XMLHttpRequest).
 * Usa el token de la sesión del usuario: las políticas de Storage deciden si se permite.
 */
export async function uploadFile(path: string, file: File, onProgress?: (fraction: number) => void): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AppError('Tu sesión ha expirado. Vuelve a iniciar sesión.');

  const endpoint = `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      let message = '';
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message ?? body.error ?? '';
      } catch {
        /* cuerpo no JSON: se usa solo el código HTTP */
      }
      reject(toAppError({ status: xhr.status, message }, 'No se pudo subir el archivo.'));
    };
    xhr.onerror = () => reject(toAppError({ message: 'Failed to fetch' }));
    xhr.onabort = () => reject(new AppError('La subida fue cancelada.'));
    xhr.send(file);
  });
}

export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw toAppError(error, 'No se pudo eliminar el archivo del almacenamiento.');
  paths.forEach(invalidateSignedUrl);
}
