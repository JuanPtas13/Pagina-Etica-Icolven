import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listCategories, listPublishedPosts, listPublishedProjects } from '../../services/content';
import { ProjectCard, PostCard } from '../../components/posts/Cards';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';

export function HomePage() {
  const projects = useAsync(() => listPublishedProjects({ limit: 3 }), []);
  const posts = useAsync(() => listPublishedPosts({ limit: 3 }), []);
  const categories = useAsync(() => listCategories().catch(() => []), []);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <h1 className="hero__title">Ideas que transforman.</h1>
          <p className="hero__text">
            Un espacio para compartir, reflexionar y dar a conocer el trabajo de nuestros estudiantes en Filosofía y Ética.
          </p>
          <Link to="/proyectos" className="btn btn--accent btn--pill">
            Explorar proyectos <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="container section" aria-labelledby="destacados">
        <div className="section__head">
          <h2 id="destacados" className="section-title">Proyectos destacados</h2>
          <Link to="/proyectos" className="link-more">Ver todos <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        {projects.loading ? (
          <Spinner />
        ) : projects.error ? (
          <ErrorState message={projects.error} onRetry={projects.reload} />
        ) : (projects.data ?? []).length === 0 ? (
          <EmptyState title="Pronto compartiremos nuestros primeros proyectos">
            Cuando el profesor publique un proyecto, aparecerá aquí.
          </EmptyState>
        ) : (
          <div className="grid grid--3">
            {(projects.data ?? []).map((p) => (
              <ProjectCard key={p.id} project={p} category={categories.data?.find((c) => c.id === p.category_id)} />
            ))}
          </div>
        )}
      </section>

      <section className="band" aria-labelledby="ultimas">
        <div className="container section">
          <div className="section__head">
            <h2 id="ultimas" className="section-title">Últimas publicaciones</h2>
            <Link to="/publicaciones" className="link-more">Ver todas <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {posts.loading ? (
            <Spinner />
          ) : posts.error ? (
            <ErrorState message={posts.error} onRetry={posts.reload} />
          ) : (posts.data ?? []).length === 0 ? (
            <EmptyState title="Aún no hay publicaciones">
              Las reflexiones y actividades de Ética y Filosofía se mostrarán aquí.
            </EmptyState>
          ) : (
            <div className="grid grid--3">
              {(posts.data ?? []).map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>

      <section className="container section purpose" aria-labelledby="proposito">
        <h2 id="proposito" className="section-title">Un espacio con propósito educativo</h2>
        <p>
          Divergente reúne actividades, debates y recursos de Ética y Filosofía del Instituto Colombo Venezolano.
          Cualquier persona puede leer las publicaciones; para comentar o dar «Me gusta» basta con crear una cuenta y confirmar el correo.
        </p>
        <div className="purpose__links">
          <Link to="/etica" className="btn btn--outline">Ética</Link>
          <Link to="/filosofia" className="btn btn--outline">Filosofía</Link>
          <Link to="/gabinete" className="btn btn--outline">Gabinete ICOLVEN</Link>
        </div>
      </section>
    </>
  );
}
