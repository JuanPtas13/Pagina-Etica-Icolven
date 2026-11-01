import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import { isValidUuid, normalizeText } from '../utils/format';
import type { Category, Post, Project } from '../types/database';

// Las consultas públicas filtran por estado en el servidor Y las políticas RLS lo vuelven a imponer.

const POST_LIST_SELECT =
  'id, project_id, category_id, created_by, title, body, status, published_at, created_at, ' +
  'projects!inner(id, title, slug), post_media(id, post_id, media_type, storage_path, external_url, title, alt_text, position)';

/**
 * Los conteos de comentarios son opcionales; los «Me gusta» no se consultan públicamente porque la
 * política actual de Supabase no permite leer reacciones a visitantes.
 */
async function attachCounts(posts: Post[]): Promise<Post[]> {
  if (posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const { data: comments, error } = await supabase.from('comments').select('post_id').in('post_id', ids).eq('status', 'visible');
  const tally = (rows: { post_id: string }[] | null): Map<string, number> => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.post_id, (m.get(r.post_id) ?? 0) + 1);
    return m;
  };
  const commentMap = error ? null : tally(comments as { post_id: string }[]);
  return posts.map((p) => ({
    ...p,
    comments: commentMap ? [{ count: commentMap.get(p.id) ?? 0 }] : undefined,
  }));
}

const PROJECT_SELECT =
  'id, created_by, title, slug, description, cover_path, status, category_id, created_at, posts(count)';

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw toAppError(error, 'No se pudieron cargar las categorías.');
  return ((data ?? []) as Category[]).sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'));
}

/** Localiza una categoría por nombre normalizado (p. ej. "Ética" → "etica"). */
export function findCategoryByName(categories: Category[], name: string): Category | undefined {
  const target = normalizeText(name);
  return categories.find((c) => normalizeText(c.name) === target);
}

export async function listPublishedProjects(opts: { categoryId?: string; limit?: number; offset?: number } = {}): Promise<Project[]> {
  let q = supabase.from('projects').select(PROJECT_SELECT).eq('status', 'published').order('created_at', { ascending: false });
  q = q.eq('posts.status', 'published');
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.limit !== undefined) {
    const offset = opts.offset ?? 0;
    q = q.range(offset, offset + opts.limit - 1);
  }
  const { data, error } = await q;
  if (error) throw toAppError(error, 'No se pudieron cargar los proyectos.');
  return (data ?? []) as unknown as Project[];
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('posts.status', 'published')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw toAppError(error, 'No se pudo cargar el proyecto.');
  return (data as unknown as Project | null) ?? null;
}

export async function listPublishedPosts(
  opts: { projectId?: string; projectIds?: string[]; limit?: number; offset?: number } = {},
): Promise<Post[]> {
  if (opts.projectIds && opts.projectIds.length === 0) return [];
  let q = supabase
    .from('posts')
    .select(POST_LIST_SELECT)
    .eq('status', 'published')
    .eq('projects.status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });
  if (opts.projectId) q = q.eq('project_id', opts.projectId);
  if (opts.projectIds) q = q.in('project_id', opts.projectIds);
  if (opts.limit !== undefined) {
    const offset = opts.offset ?? 0;
    q = q.range(offset, offset + opts.limit - 1);
  }
  const { data, error } = await q;
  if (error) throw toAppError(error, 'No se pudieron cargar las publicaciones.');
  return attachCounts((data ?? []) as unknown as Post[]);
}

export async function getPublishedPost(id: string): Promise<Post | null> {
  if (!isValidUuid(id)) return null;
  const { data, error } = await supabase
    .from('posts')
    .select(POST_LIST_SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .eq('projects.status', 'published')
    .maybeSingle();
  if (error) throw toAppError(error, 'No se pudo cargar la publicación.');
  if (!data) return null;
  const [withCounts] = await attachCounts([data as unknown as Post]);
  return withCounts;
}