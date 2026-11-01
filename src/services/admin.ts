import { supabase } from '../lib/supabase';
import { AppError, toAppError } from '../lib/errors';
import { isValidSlug, isValidUuid, slugify } from '../utils/format';
import { buildStoragePath, removeFiles, uploadFile } from './storage';
import { ALLOWED_UPLOAD_TYPES, COVER_TYPES, validateUpload } from '../utils/media';
import { fetchDisplayNames } from './participation';
import type {
  Category, CommentRow, CommentStatus, ContentStatus, Post, PostMedia, Profile, ProfileStatus, Project,
} from '../types/database';

// Todas estas operaciones dependen de las políticas del profesor en la base de datos.
// Las actualizaciones piden `.select()` para detectar el caso "RLS filtró la fila sin error".

function requireRows<T>(rows: T[] | null, message: string): T[] {
  if (!rows || rows.length === 0) throw new AppError(message);
  return rows;
}

// ------------------------------------------------------------------ dashboard

export interface DashboardCounts {
  projects: number;
  posts: number;
  comments: number;
  activeUsers: number;
}

async function countRows(table: 'projects' | 'posts' | 'comments' | 'profiles', status?: string): Promise<number> {
  const base = supabase.from(table).select('id', { count: 'exact', head: true });
  const { count, error } = status ? await base.eq('status', status) : await base;
  if (error) throw toAppError(error, 'No se pudieron calcular las estadísticas.');
  return count ?? 0;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [projects, posts, comments, activeUsers] = await Promise.all([
    countRows('projects'),
    countRows('posts'),
    countRows('comments', 'visible'),
    countRows('profiles', 'active'),
  ]);
  return { projects, posts, comments, activeUsers };
}

// ------------------------------------------------------------------ categorías

async function getCategorySlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(name).replace(/-+$/g, '');
  if (!isValidSlug(baseSlug)) {
    throw new AppError('El nombre de la categoría debe incluir letras o números.');
  }

  let query = supabase.from('categories').select('id, slug');
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw toAppError(error, 'No se pudo comprobar el nombre de la categoría.');

  const usedSlugs = new Set((data ?? []).map((category) => category.slug));
  if (!usedSlugs.has(baseSlug)) return baseSlug;

  for (let suffix = 2; ; suffix += 1) {
    const ending = `-${suffix}`;
    const slug = `${baseSlug.slice(0, 80 - ending.length).replace(/-+$/g, '')}${ending}`;
    if (!usedSlugs.has(slug)) return slug;
  }
}

export async function saveCategory(input: { id?: string; name: string }): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new AppError('El nombre de la categoría es obligatorio.');
  const slug = await getCategorySlug(name, input.id);
  if (input.id) {
    const { data, error } = await supabase.from('categories').update({ name, slug }).eq('id', input.id).select('*');
    if (error) throw toAppError(error, 'No se pudo actualizar la categoría.');
    return requireRows(data, 'No tienes permiso para editar esta categoría.')[0] as Category;
  }
  const { data, error } = await supabase.from('categories').insert({ name, slug }).select('*').single();
  if (error) throw toAppError(error, 'No se pudo crear la categoría.');
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id');
  if (error) throw toAppError(error, 'No se pudo eliminar la categoría. Puede estar en uso por proyectos o publicaciones.');
  requireRows(data, 'No tienes permiso para eliminar esta categoría.');
}

// ------------------------------------------------------------------- proyectos

export async function listAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, created_by, title, slug, description, cover_path, status, category_id, created_at, updated_at, posts(count)')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'No se pudieron cargar los proyectos.');
  return (data ?? []) as unknown as Project[];
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let q = supabase.from('projects').select('id').eq('slug', slug).limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw toAppError(error, 'No se pudo comprobar el slug.');
  return (data ?? []).length > 0;
}

export interface ProjectInput {
  id?: string;
  title: string;
  slug: string;
  description: string;
  status: ContentStatus;
  category_id: string | null;
  cover_path?: string | null;
}

async function draftPublishedPosts(projectId: string): Promise<number> {
  const { data: posts, error: listError } = await supabase
    .from('posts')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'published');
  if (listError) throw toAppError(listError, 'No se pudieron retirar las publicaciones del proyecto.');

  const postIds = (posts ?? []).map((post) => post.id);
  if (postIds.length === 0) return 0;

  const { data: updatedPosts, error: updateError } = await supabase
    .from('posts')
    .update({ status: 'draft' })
    .in('id', postIds)
    .eq('status', 'published')
    .select('id');
  if (updateError) throw toAppError(updateError, 'No se pudieron pasar las publicaciones a borrador.');
  if ((updatedPosts ?? []).length !== postIds.length) {
    throw new AppError('No se pudieron pasar todas las publicaciones del proyecto a borrador. El proyecto no se cambió.');
  }
  return postIds.length;
}

export async function saveProject(input: ProjectInput, userId: string): Promise<Project> {
  const title = input.title.trim();
  if (!title) throw new AppError('El título es obligatorio.');
  if (!isValidSlug(input.slug)) {
    throw new AppError('El slug solo puede tener letras minúsculas, números y guiones (por ejemplo: el-arte-de-cuestionar).');
  }
  if (await isSlugTaken(input.slug, input.id)) throw new AppError('Ya existe un proyecto con ese slug. Elige otro.');

  const payload = {
    title,
    slug: input.slug,
    description: input.description.trim() || null,
    status: input.status,
    category_id: input.category_id,
    ...(input.cover_path !== undefined ? { cover_path: input.cover_path } : {}),
  };

  if (input.id) {
    if (input.status !== 'published') await draftPublishedPosts(input.id);
    const { data, error } = await supabase.from('projects').update(payload).eq('id', input.id).select('*');
    if (error) throw toAppError(error, 'No se pudo guardar el proyecto.');
    return requireRows(data, 'No tienes permiso para editar este proyecto.')[0] as Project;
  }
  const { data, error } = await supabase.from('projects').insert({ ...payload, created_by: userId }).select('*').single();
  if (error) throw toAppError(error, 'No se pudo crear el proyecto.');
  return data as Project;
}

export async function setProjectStatus(id: string, status: ContentStatus): Promise<number> {
  const draftedPosts = status === 'published' ? 0 : await draftPublishedPosts(id);
  const { data, error } = await supabase.from('projects').update({ status }).eq('id', id).select('id');
  if (error) throw toAppError(error, 'No se pudo cambiar el estado del proyecto.');
  requireRows(data, 'No tienes permiso para cambiar este proyecto.');
  return draftedPosts;
}

/** Sube la portada. La primera carpeta de la ruta es el UUID del proyecto (convención de `is_public_media_path`). */
export async function uploadProjectCover(
  projectId: string,
  file: File,
  previousPath: string | null,
  onProgress?: (f: number) => void,
): Promise<string> {
  const problem = validateUpload(file, COVER_TYPES);
  if (problem) throw new AppError(problem.includes('Formato') ? 'La portada debe ser JPG, PNG o WEBP.' : problem);
  const path = buildStoragePath(projectId, file.name, file.type, 'portada');
  await uploadFile(path, file, onProgress);
  const { data, error } = await supabase.from('projects').update({ cover_path: path }).eq('id', projectId).select('id');
  if (error || !data?.length) {
    await removeFiles([path]).catch(() => undefined);
    throw toAppError(error ?? { code: '42501' }, 'No se pudo asociar la portada al proyecto.');
  }
  if (previousPath && previousPath !== path) await removeFiles([previousPath]).catch(() => undefined);
  return path;
}

// --------------------------------------------------------------- publicaciones

export async function listAllPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, project_id, category_id, created_by, title, body, status, published_at, created_at, updated_at, projects(id, title, slug), post_media(id, post_id, media_type, storage_path, external_url, title, alt_text, position)')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'No se pudieron cargar las publicaciones.');
  return (data ?? []) as unknown as Post[];
}

export async function getPostForEdit(id: string): Promise<Post | null> {
  if (!isValidUuid(id)) return null;
  const { data, error } = await supabase
    .from('posts')
    .select('id, project_id, category_id, created_by, title, body, status, published_at, created_at, updated_at, projects(id, title, slug), post_media(id, post_id, media_type, storage_path, external_url, title, alt_text, position)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toAppError(error, 'No se pudo cargar la publicación.');
  return (data as unknown as Post | null) ?? null;
}

export interface PostInput {
  id: string; // el cliente genera el UUID para poder subir archivos con la carpeta correcta antes de guardar
  isNew: boolean;
  project_id: string;
  category_id: string | null;
  title: string;
  body: string;
  status: ContentStatus;
}

export function assertPostCanBePublished(projectStatus: ContentStatus | null | undefined): void {
  if (projectStatus !== 'published') {
    throw new AppError('Publica primero el proyecto antes de publicar sus publicaciones.');
  }
}

export async function savePost(input: PostInput, userId: string, previousStatus?: ContentStatus): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new AppError('El título es obligatorio.');
  if (!input.project_id) throw new AppError('Selecciona el proyecto al que pertenece la publicación.');
  if (input.status === 'published') {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', input.project_id)
      .maybeSingle();
    if (error) throw toAppError(error, 'No se pudo comprobar el estado del proyecto.');
    assertPostCanBePublished(project?.status ?? null);
  }

  const publishing = input.status === 'published' && previousStatus !== 'published';
  const base = {
    project_id: input.project_id,
    category_id: input.category_id,
    title,
    body: input.body.trim() || null,
    status: input.status,
    ...(publishing ? { published_at: new Date().toISOString() } : {}),
  };

  if (input.isNew) {
    const { error } = await supabase.from('posts').insert({ id: input.id, created_by: userId, ...base });
    if (error) throw toAppError(error, 'No se pudo crear la publicación.');
    return;
  }
  const { data, error } = await supabase.from('posts').update(base).eq('id', input.id).select('id');
  if (error) throw toAppError(error, 'No se pudo guardar la publicación.');
  requireRows(data, 'No tienes permiso para editar esta publicación.');
}

export async function setPostStatus(post: Pick<Post, 'id' | 'status' | 'published_at'>, status: ContentStatus): Promise<void> {
  if (status === 'published') {
    const { data: publication, error: publicationError } = await supabase
      .from('posts')
      .select('project_id')
      .eq('id', post.id)
      .maybeSingle();
    if (publicationError) throw toAppError(publicationError, 'No se pudo comprobar el proyecto de la publicación.');
    if (!publication?.project_id) throw new AppError('La publicación no tiene proyecto asociado.');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', publication.project_id)
      .maybeSingle();
    if (projectError) throw toAppError(projectError, 'No se pudo comprobar el estado del proyecto.');
    assertPostCanBePublished(project?.status ?? null);
  }

  const patch: Record<string, unknown> = { status };
  if (status === 'published' && !post.published_at) patch.published_at = new Date().toISOString();
  const { data, error } = await supabase.from('posts').update(patch).eq('id', post.id).select('id');
  if (error) throw toAppError(error, 'No se pudo cambiar el estado de la publicación.');
  requireRows(data, 'No tienes permiso para cambiar esta publicación.');
}

// ------------------------------------------------------------------ multimedia

export async function uploadPostMedia(
  postId: string,
  file: File,
  position: number,
  onProgress?: (f: number) => void,
): Promise<PostMedia> {
  const problem = validateUpload(file);
  if (problem) throw new AppError(problem);
  const kind = ALLOWED_UPLOAD_TYPES[file.type];
  const path = buildStoragePath(postId, file.name, file.type); // <UUID_PUBLICACION>/archivo
  await uploadFile(path, file, onProgress);
  const { data, error } = await supabase
    .from('post_media')
    .insert({
      post_id: postId,
      media_type: kind,
      storage_path: path,
      title: file.name.replace(/\.[^.]+$/, ''),
      alt_text: kind === 'image' ? '' : null,
      position,
    })
    .select('*')
    .single();
  if (error) {
    await removeFiles([path]).catch(() => undefined); // no dejar archivos huérfanos
    throw toAppError(error, 'El archivo se subió pero no se pudo registrar en la publicación.');
  }
  return data as PostMedia;
}

export async function addExternalMedia(postId: string, url: string, title: string, mediaType: 'video' | 'link', position: number): Promise<PostMedia> {
  const { data, error } = await supabase
    .from('post_media')
    .insert({ post_id: postId, media_type: mediaType, external_url: url, title: title.trim() || null, position })
    .select('*')
    .single();
  if (error) throw toAppError(error, 'No se pudo agregar el enlace.');
  return data as PostMedia;
}

export async function updateMediaMeta(id: string, patch: { title: string; alt_text: string; position: number }): Promise<void> {
  const { data, error } = await supabase
    .from('post_media')
    .update({ title: patch.title.trim() || null, alt_text: patch.alt_text.trim() || null, position: patch.position })
    .eq('id', id)
    .select('id');
  if (error) throw toAppError(error, 'No se pudieron guardar los datos del archivo.');
  requireRows(data, 'No tienes permiso para editar este archivo.');
}

export async function deleteMedia(media: Pick<PostMedia, 'id' | 'storage_path'>): Promise<void> {
  const { data, error } = await supabase.from('post_media').delete().eq('id', media.id).select('id');
  if (error) throw toAppError(error, 'No se pudo eliminar el archivo.');
  requireRows(data, 'No tienes permiso para eliminar este archivo.');
  if (media.storage_path) await removeFiles([media.storage_path]).catch(() => undefined);
}

// ----------------------------------------------------------------- comentarios

export interface AdminComment extends CommentRow {
  author_name: string;
  post_title: string;
}

export interface AdminCommentsPage {
  comments: AdminComment[];
  total: number;
}

export async function listAllComments(
  status: CommentStatus | undefined,
  page: number,
  pageSize: number,
): Promise<AdminCommentsPage> {
  let q = supabase
    .from('comments')
    .select('id, post_id, user_id, body, status, created_at, updated_at, posts(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (status) q = q.eq('status', status);
  const { data, count, error } = await q;
  if (error) throw toAppError(error, 'No se pudieron cargar los comentarios.');
  const rows = (data ?? []) as unknown as (CommentRow & { posts: { title: string } | null })[];
  const names = await fetchDisplayNames(rows.map((r) => r.user_id));
  return {
    comments: rows.map(({ posts, ...c }) => ({
      ...c,
      author_name: names.get(c.user_id) ?? 'Miembro',
      post_title: posts?.title ?? 'Publicación',
    })),
    total: count ?? rows.length,
  };
}

export async function setCommentStatus(id: string, status: CommentStatus): Promise<void> {
  const { data, error } = await supabase.from('comments').update({ status }).eq('id', id).select('id');
  if (error) throw toAppError(error, 'No se pudo moderar el comentario.');
  requireRows(data, 'No tienes permiso para moderar este comentario.');
}

// -------------------------------------------------------------------- usuarios

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, status, avatar_path, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'No se pudieron cargar los usuarios.');
  return (data ?? []) as Profile[];
}

/**
 * Solo permite suspender o reactivar. Nunca toca `role` y nunca activa perfiles `pending`
 * (la activación de pendientes ocurre únicamente al confirmar el correo, vía disparador).
 */
export async function setMemberStatus(target: Profile, next: Extract<ProfileStatus, 'active' | 'suspended'>, actingUserId: string): Promise<void> {
  if (target.id === actingUserId) throw new AppError('No puedes cambiar el estado de tu propia cuenta.');
  if (target.role === 'teacher') throw new AppError('La cuenta del profesor no se puede suspender desde el panel.');
  if (target.status === 'pending') throw new AppError('Esta cuenta aún no confirmó su correo; se activará sola al confirmarlo.');
  const { data, error } = await supabase.from('profiles').update({ status: next }).eq('id', target.id).select('id');
  if (error) throw toAppError(error, 'No se pudo cambiar el estado del usuario.');
  requireRows(data, 'No tienes permiso para cambiar el estado de este usuario.');
}
