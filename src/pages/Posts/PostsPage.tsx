import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listPublishedPosts } from '../../services/content';
import { PostCard } from '../../components/posts/Cards';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { normalizeText } from '../../utils/format';

export function PostsPage() {
  const posts = useAsync(() => listPublishedPosts({ limit: 60 }), []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const all = posts.data ?? [];
    if (!q) return all;
    return all.filter((p) => normalizeText(`${p.title} ${p.projects?.title ?? ''}`).includes(q));
  }, [posts.data, query]);

  return (
    <>
      <section className="hero hero--short">
        <div className="container hero__inner">
          <h1 className="hero__title">Publicaciones</h1>
          <p className="hero__text">Actividades, reflexiones y recursos compartidos por el profesor y los estudiantes.</p>
        </div>
      </section>
      <div className="container section">
        <div className="search">
          <label htmlFor="buscar" className="visually-hidden">Buscar publicaciones</label>
          <Search size={18} aria-hidden="true" />
          <input id="buscar" type="search" className="input" placeholder="Buscar por título o proyecto" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {posts.loading ? (
          <Spinner />
        ) : posts.error ? (
          <ErrorState message={posts.error} onRetry={posts.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState title={query ? 'No encontramos resultados' : 'Aún no hay publicaciones'}>
            {query ? 'Prueba con otras palabras.' : 'Cuando el profesor publique contenido, lo verás aquí.'}
          </EmptyState>
        ) : (
          <div className="grid grid--3">
            {filtered.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
