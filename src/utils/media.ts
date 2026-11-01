import type { PostMedia } from '../types/database';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // límite del bucket: 50 MiB

export const ALLOWED_UPLOAD_TYPES: Record<string, 'image' | 'video' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
};

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateUpload(file: { type: string; size: number }, allowed?: string[]): string | null {
  const types = allowed ?? Object.keys(ALLOWED_UPLOAD_TYPES);
  if (!types.includes(file.type)) return 'Formato no admitido. Usa imágenes (JPG, PNG, WEBP, GIF), videos (MP4, WEBM) o documentos (PDF, DOCX, PPTX, XLSX).';
  if (file.size <= 0) return 'El archivo está vacío.';
  if (file.size > MAX_UPLOAD_BYTES) return 'El archivo supera el máximo de 50 MB.';
  return null;
}

export type MediaKind = 'image' | 'video' | 'document' | 'link';

export function classifyMedia(m: Pick<PostMedia, 'media_type' | 'storage_path' | 'external_url'>): MediaKind {
  const t = (m.media_type ?? '').toLowerCase();
  if (t.includes('image') || t.includes('imagen') || t.includes('photo')) return 'image';
  if (t.includes('video')) return 'video';
  if (!m.storage_path && m.external_url) return 'link';
  if (t.includes('doc') || t.includes('pdf') || t.includes('file')) return 'document';
  return m.storage_path ? 'document' : 'link';
}

/** Solo se aceptan enlaces http(s). Devuelve null si no es seguro. */
export function safeExternalUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/** Devuelve la URL de incrustación si el enlace es de YouTube o Vimeo; null en otro caso. */
export function embedUrl(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = u.searchParams.get('v');
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.slice(1);
    return /^\d{5,12}$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export function fileExtension(name: string, mime: string): string {
  const fromName = name.includes('.') ? name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  if (fromName) return fromName.slice(0, 8);
  const map: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  return map[mime] ?? 'bin';
}
