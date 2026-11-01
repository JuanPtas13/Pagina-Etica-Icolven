import { supabase } from '../lib/supabase';
import { AppError, toAppError } from '../lib/errors';
import type { CommentRow, CommentWithAuthor } from '../types/database';

export const MAX_COMMENT_LENGTH = 2000;

// ---------------------------------------------------------------- comentarios

export async function listVisibleComments(postId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, status, created_at, updated_at')
    .eq('post_id', postId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });
  if (error) throw toAppError(error, 'No se pudieron cargar los comentarios.');
  const rows = (data ?? []) as CommentRow[];
  const names = await fetchDisplayNames(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, author_name: names.get(r.user_id) ?? 'Miembro de la comunidad' }));
}

/** Los nombres son opcionales: si las políticas no permiten leer otros perfiles, se usa un nombre genérico. */
export async function fetchDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', unique);
  if (error || !data) return map;
  for (const p of data as { id: string; display_name: string | null }[]) {
    if (p.display_name) map.set(p.id, p.display_name);
  }
  return map;
}

export function validateComment(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 'Escribe un comentario antes de enviarlo.';
  if (trimmed.length > MAX_COMMENT_LENGTH) return `El comentario no puede superar ${MAX_COMMENT_LENGTH} caracteres.`;
  return null;
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const problem = validateComment(body);
  if (problem) throw new AppError(problem);
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, body: body.trim() });
  if (error) throw toAppError(error, 'No se pudo publicar tu comentario.');
}

/** Elimina (marca como "deleted") un comentario propio. Si las políticas no lo permiten, no se afecta ninguna fila. */
export async function deleteOwnComment(commentId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('comments')
    .update({ status: 'deleted' })
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw toAppError(error, 'No se pudo eliminar el comentario.');
  if (!data || data.length === 0) throw new AppError('No tienes permiso para eliminar este comentario.');
}

// ------------------------------------------------------------------ reacciones

export async function countLikes(postId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('reaction_type', 'like');
  if (error) return null; // el conteo es opcional: puede no ser consultable según las políticas
  return count ?? 0;
}

export async function hasLiked(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('reactions')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', 'like')
    .maybeSingle();
  if (error) throw toAppError(error, 'No se pudo consultar tu reacción.');
  return Boolean(data);
}

export async function addLike(postId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction_type: 'like' });
  // 23505: ya existía (restricción de unicidad) → el resultado final es el mismo que el deseado.
  if (error && error.code !== '23505') throw toAppError(error, 'No se pudo registrar tu «Me gusta».');
}

export async function removeLike(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', 'like');
  if (error) throw toAppError(error, 'No se pudo retirar tu «Me gusta».');
}
