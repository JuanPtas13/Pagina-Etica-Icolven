// Tipos escritos a mano a partir del contrato descrito del esquema existente.
// Si más adelante generas los tipos con `supabase gen types`, reemplaza este archivo.

export type ProfileRole = 'teacher' | 'member';
export type ProfileStatus = 'pending' | 'active' | 'suspended';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type CommentStatus = 'visible' | 'hidden' | 'deleted';

export interface Profile {
  id: string;
  display_name: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  avatar_path: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string;
}

export interface Project {
  id: string;
  created_by: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  status: ContentStatus;
  category_id: string | null;
  created_at?: string;
  updated_at?: string;
  posts?: { count: number }[];
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: string;
  storage_path: string | null;
  external_url: string | null;
  title: string | null;
  alt_text: string | null;
  position: number;
}

export interface Post {
  id: string;
  project_id: string;
  category_id: string | null;
  created_by: string;
  title: string;
  body: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
  projects?: Pick<Project, 'id' | 'title' | 'slug'> | null;
  post_media?: PostMedia[];
  reactions?: { count: number }[];
  comments?: { count: number }[];
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at?: string;
}

export interface CommentWithAuthor extends CommentRow {
  author_name: string;
}

export type ReactionType = 'like';
