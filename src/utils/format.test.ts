import { describe, expect, it } from 'vitest';
import { excerpt, isValidSlug, isValidUuid, slugify } from './format';
import { classifyMedia, embedUrl, safeExternalUrl, validateUpload, MAX_UPLOAD_BYTES } from './media';
import { explainError } from '../lib/errors';
import { assertPostCanBePublished } from '../services/admin';

describe('slugify / isValidSlug', () => {
  it('quita acentos y símbolos', () => {
    expect(slugify('¿Qué es la libertad? — Ética')).toBe('que-es-la-libertad-etica');
  });
  it('valida slugs', () => {
    expect(isValidSlug('el-arte-de-cuestionar')).toBe(true);
    expect(isValidSlug('Con Espacios')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

describe('isValidUuid', () => {
  it('acepta UUIDs y rechaza identificadores mal formados', () => {
    expect(isValidUuid('3533f6c7-2e74-4e7c-b97e-b33f84345618')).toBe(true);
    expect(isValidUuid('NO-ES-UN-UUID')).toBe(false);
  });
});

describe('excerpt', () => {
  it('recorta textos largos y tolera null', () => {
    expect(excerpt(null)).toBe('');
    expect(excerpt('a'.repeat(300), 10)).toBe('aaaaaaaaaa…');
  });
});

describe('validateUpload', () => {
  it('rechaza formatos no admitidos y archivos grandes', () => {
    expect(validateUpload({ type: 'application/x-msdownload', size: 10 })).not.toBeNull();
    expect(validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull();
    expect(validateUpload({ type: 'image/png', size: 1000 })).toBeNull();
  });
});

describe('enlaces externos', () => {
  it('solo acepta http(s)', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('https://example.com/a')).not.toBeNull();
  });
  it('detecta YouTube', () => {
    const u = safeExternalUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')!;
    expect(embedUrl(u)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedUrl(safeExternalUrl('https://example.com')!)).toBeNull();
  });
});

describe('classifyMedia', () => {
  it('clasifica por tipo', () => {
    expect(classifyMedia({ media_type: 'image', storage_path: 'a/b.jpg', external_url: null })).toBe('image');
    expect(classifyMedia({ media_type: 'video', storage_path: null, external_url: 'https://x.y' })).toBe('video');
    expect(classifyMedia({ media_type: 'link', storage_path: null, external_url: 'https://x.y' })).toBe('link');
  });
});

describe('assertPostCanBePublished', () => {
  it('solo permite publicar si el proyecto está publicado', () => {
    expect(() => assertPostCanBePublished('draft')).toThrow(/proyecto antes de publicar/i);
    expect(() => assertPostCanBePublished('published')).not.toThrow();
  });
});

describe('explainError', () => {
  it('no filtra detalles internos', () => {
    const msg = explainError({ code: '42501', message: 'new row violates row-level security policy for table "comments"' });
    expect(msg).not.toMatch(/comments|policy|row-level/i);
  });
  it('traduce credenciales incorrectas', () => {
    expect(explainError({ message: 'Invalid login credentials' })).toMatch(/correo|contraseña/i);
  });
  it('explica rechazos comunes al guardar proyectos', () => {
    expect(explainError({ code: '23505', message: 'duplicate key value violates unique constraint "projects_slug_key"' })).toMatch(/slug/i);
    expect(explainError({ code: '23503' })).toMatch(/categoría/i);
    expect(explainError({ code: 'PGRST204' })).toMatch(/estructura de la base de datos/i);
    expect(explainError({ status: 400 })).toMatch(/Supabase rechazó los datos enviados/i);
  });
});
