import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getPublishedPost } from '../../services/content';
import { MediaGallery } from '../../components/media/MediaGallery';
import { LikeButton } from '../../components/posts/LikeButton';
import { CommentSection } from '../../components/comments/CommentSection';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { countOf, formatDateLong } from '../../utils/format';

export function PostDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => getPublishedPost(id), [id]);

  if (state.loading) return <div className="container page"><Spinner /></div>;
  if (state.error) return <div className="container page"><ErrorState message={state.error} onRetry={state.reload} /></div>;
  const post = state.data;
  if (!post) {
    return (
      <div className="container page">
        <EmptyState title="Publicación no encontrada" action={<Link to="/publicaciones" className="btn btn--primary">Ver publicaciones</Link>}>
          Es posible que el enlace sea incorrecto o que la publicación ya no esté disponible.
        </EmptyState>
      </div>
    );
  }

  const paragraphs = (post.body ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="container page post">
      <Link to="/publicaciones" className="back-link back-link--dark"><ArrowLeft size={16} aria-hidden="true" /> Volver a publicaciones</Link>
      <h1 className="post__title">{post.title}</h1>
      <p className="post__meta">
        {post.published_at && <time dateTime={post.published_at}>{formatDateLong(post.published_at)}</time>}
        {post.projects && (
          <>
            {post.published_at ? ' · ' : ''}Proyecto: <Link to={`/proyectos/${post.projects.slug}`}>{post.projects.title}</Link>
          </>
        )}
      </p>

      <MediaGallery media={post.post_media ?? []} />

      {paragraphs.length > 0 && (
        <div className="post__body">
          {/* Texto plano renderizado por React (escapado). Se conservan los saltos de línea con CSS. */}
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}

      <LikeButton postId={post.id} fallbackCount={countOf(post.reactions)} />
      <CommentSection postId={post.id} />
    </article>
  );
}
