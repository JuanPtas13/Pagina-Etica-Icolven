import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MessageCircle, FileText } from 'lucide-react';
import { SignedImage } from '../media/SignedImage';
import { classifyMedia } from '../../utils/media';
import { countOf, excerpt, formatDate } from '../../utils/format';
import type { Category, Post, Project } from '../../types/database';

export function ProjectCard({ project, category }: { project: Project; category?: Category }) {
  const posts = countOf(project.posts);
  return (
    <Link to={`/proyectos/${project.slug}`} className="card card--project">
      <SignedImage path={project.cover_path} alt="" decorative className="card__img" />
      <div className="card__body">
        {category && <span className="chip">{category.name}</span>}
        <h3 className="card__title">{project.title}</h3>
        {project.description && <p className="card__text">{excerpt(project.description, 110)}</p>}
        <div className="card__meta">
          <span><FileText size={14} aria-hidden="true" /> {posts} {posts === 1 ? 'publicación' : 'publicaciones'}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function firstImagePath(post: Post): string | null {
  const media = [...(post.post_media ?? [])].sort((a, b) => a.position - b.position);
  return media.find((m) => classifyMedia(m) === 'image' && m.storage_path)?.storage_path ?? null;
}

export function PostCard({ post, layout = 'vertical' }: { post: Post; layout?: 'vertical' | 'horizontal' }) {
  const comments = countOf(post.comments);
  return (
    <Link to={`/publicaciones/${post.id}`} className={`card card--post card--${layout}`}>
      <SignedImage path={firstImagePath(post)} alt="" decorative className="card__img" />
      <div className="card__body">
        <h3 className="card__title">{post.title}</h3>
        <p className="card__date">
          {formatDate(post.published_at)}
          {post.projects?.title ? ` · ${post.projects.title}` : ''}
        </p>
        {layout === 'horizontal' && post.body && <p className="card__text">{excerpt(post.body, 120)}</p>}
        <div className="card__meta">
          {post.reactions && <span aria-label={`${countOf(post.reactions)} me gusta`}><Heart size={14} aria-hidden="true" /> {countOf(post.reactions)}</span>}
          <span aria-label={`${comments} comentarios`}><MessageCircle size={14} aria-hidden="true" /> {comments}</span>
        </div>
      </div>
    </Link>
  );
}
