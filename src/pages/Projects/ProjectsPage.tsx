import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { findCategoryByName, listCategories, listPublishedPosts, listPublishedProjects } from '../../services/content';
import { PostCard, ProjectCard } from '../../components/posts/Cards';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';

export type Area = 'all' | 'etica' | 'filosofia' | 'gabinete';

const AREAS: Record<Area, { title: string; intro: string; categoryName?: string }> = {
  all: { title: 'Proyectos', intro: 'Explora los diferentes proyectos que desarrollan nuestros estudiantes en Filosofía y Ética.' },
  etica: { title: 'Ética', intro: 'Publicaciones, actividades y recursos para pensar cómo actuamos y por qué.', categoryName: 'Ética' },
  filosofia: { title: 'Filosofía', intro: 'Contenidos, reflexiones y actividades para aprender a hacernos buenas preguntas.', categoryName: 'Filosofía' },
  gabinete: {
    title: 'Gabinete ICOLVEN',
    intro: 'El espacio general del Instituto Colombo Venezolano para presentar proyectos, actividades y contenidos educativos.',
  },
};

const TABS: { area: Area; to: string; label: string }[] = [
  { area: 'all', to: '/proyectos', label: 'Todos' },
  { area: 'filosofia', to: '/filosofia', label: 'Filosofía' },
  { area: 'etica', to: '/etica', label: 'Ética' },
];

const PAGE_SIZE = 30;

export function ProjectsPage({ area = 'all' }: { area?: Area }) {
  const cfg = AREAS[area];
  const [page, setPage] = useState(0);

  const data = useAsync(async () => {
    const categories = await listCategories();
    let categoryId: string | undefined;
    if (cfg.categoryName) {
      const cat = findCategoryByName(categories, cfg.categoryName);
      // Si la categoría aún no existe, el área se muestra vacía (no se cargan todos los registros).
      if (!cat) return { categories, projects: [], posts: [], missingCategory: true };
      categoryId = cat.id;
    }
    const rows = await listPublishedProjects({ categoryId, limit: PAGE_SIZE + 1, offset: page * PAGE_SIZE });
    const hasMore = rows.length > PAGE_SIZE;
    const projects = rows.slice(0, PAGE_SIZE);
    const posts = area === 'all' ? [] : await listPublishedPosts({ projectIds: projects.map((p) => p.id), limit: 6 });
    return { categories, projects, posts, missingCategory: false, hasMore };
  }, [area, page]);

  useEffect(() => {
    setPage(0);
  }, [area]);

  const showTabs = area === 'all' || area === 'etica' || area === 'filosofia';

  return (
    <>
      <section className="hero hero--short">
        <div className="container hero__inner">
          <h1 className="hero__title">{cfg.title}</h1>
          <p className="hero__text">{cfg.intro}</p>
        </div>
      </section>

      <div className="container section">
        {showTabs && (
          <nav className="tabs" aria-label="Filtrar por área">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} className={`tab ${t.area === area ? 'is-active' : ''}`} aria-current={t.area === area ? 'page' : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        {data.loading ? (
          <Spinner />
        ) : data.error ? (
          <ErrorState message={data.error} onRetry={data.reload} />
        ) : (
          <>
            {(data.data?.projects ?? []).length === 0 ? (
              <EmptyState title={data.data?.missingCategory ? 'Esta área aún no está configurada' : 'Todavía no hay proyectos aquí'}>
                {data.data?.missingCategory
                  ? 'Cuando el profesor cree la categoría y publique proyectos, los verás en esta página.'
                  : 'Vuelve pronto: el profesor publicará nuevos proyectos.'}
              </EmptyState>
            ) : (
              <div className="grid grid--2">
                {(data.data?.projects ?? []).map((p) => (
                  <ProjectCard key={p.id} project={p} category={data.data?.categories.find((c) => c.id === p.category_id)} />
                ))}
              </div>
            )}

            {area !== 'all' && (data.data?.posts ?? []).length > 0 && (
              <section aria-labelledby="area-posts" className="section">
                <h2 id="area-posts" className="section-title">Publicaciones recientes</h2>
                <div className="grid grid--3">
                  {(data.data?.posts ?? []).map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              </section>
            )}

            {(page > 0 || data.data?.hasMore) && (
              <div className="form__actions">
                <button type="button" className="btn btn--outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</button>
                <button type="button" className="btn btn--outline" disabled={!data.data?.hasMore} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
