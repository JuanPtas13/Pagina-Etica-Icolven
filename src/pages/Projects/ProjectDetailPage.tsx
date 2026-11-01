import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getPublishedProjectBySlug, listCategories, listPublishedPosts } from '../../services/content';
import { PostCard } from '../../components/posts/Cards';
import { SignedImage } from '../../components/media/SignedImage';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { countOf } from '../../utils/format';

const PAGE_SIZE = 30;

export function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const [page, setPage] = useState(0);
  const state = useAsync(async () => {
    const project = await getPublishedProjectBySlug(slug);
    if (!project) return null;
    const [posts, categories] = await Promise.all([
      listPublishedPosts({ projectId: project.id, limit: PAGE_SIZE + 1, offset: page * PAGE_SIZE }),
      listCategories().catch(() => []),
    ]);
    return { project, posts: posts.slice(0, PAGE_SIZE), hasMore: posts.length > PAGE_SIZE, category: categories.find((c) => c.id === project.category_id) };
  }, [slug, page]);

  if (state.loading) return <div className="container page"><Spinner /></div>;
  if (state.error) return <div className="container page"><ErrorState message={state.error} onRetry={state.reload} /></div>;
  if (!state.data) {
    return (
      <div className="container page">
        <EmptyState title="Proyecto no encontrado" action={<Link to="/proyectos" className="btn btn--primary">Ver proyectos</Link>}>
          Es posible que el enlace sea incorrecto o que el proyecto aún no esté publicado.
        </EmptyState>
      </div>
    );
  }
  const { project, posts, category, hasMore } = state.data;
  const postCount = countOf(project.posts);

  return (
    <>
      <section className="hero hero--cover">
        {project.cover_path && <SignedImage path={project.cover_path} alt="" decorative className="hero__bg" />}
        <div className="container hero__inner">
          <Link to="/proyectos" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Todos los proyectos</Link>
          {category && <span className="chip chip--onDark">{category.name}</span>}
          <h1 className="hero__title">{project.title}</h1>
          {project.description && <p className="hero__text">{project.description}</p>}
          <p className="hero__meta"><FileText size={14} aria-hidden="true" /> {postCount} {postCount === 1 ? 'publicación' : 'publicaciones'}</p>
        </div>
      </section>

      <section className="container section" aria-labelledby="pub-proyecto">
        <h2 id="pub-proyecto" className="section-title">Publicaciones recientes</h2>
        {posts.length === 0 && page === 0 && (
          <EmptyState title="Este proyecto aún no tiene publicaciones">Vuelve pronto para ver las actividades.</EmptyState>
        )}
        {posts.length > 0 && (
          <div className="stack">
            {posts.map((p) => <PostCard key={p.id} post={p} layout="horizontal" />)}
          </div>
        )}
        {(page > 0 || hasMore) && (
          <div className="form__actions">
            <button type="button" className="btn btn--outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</button>
            <button type="button" className="btn btn--outline" disabled={!hasMore} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
          </div>
        )}
      </section>
    </>
  );
}
