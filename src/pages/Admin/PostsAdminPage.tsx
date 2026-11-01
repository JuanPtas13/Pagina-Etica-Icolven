import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { listAllPosts, setPostStatus } from '../../services/admin';
import { explainError } from '../../lib/errors';
import { formatDate } from '../../utils/format';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { StatusBadge } from './shared';
import type { ContentStatus, Post } from '../../types/database';

export function PostsAdminPage() {
  const posts = useAsync(listAllPosts, []);
  const [error, setError] = useState<string | null>(null);

  async function change(p: Post, status: ContentStatus) {
    const verb = status === 'archived' ? 'archivar' : status === 'published' ? 'publicar' : 'pasar a borrador';
    if (!window.confirm(`¿Seguro que quieres ${verb} «${p.title}»?`)) return;
    setError(null);
    try {
      await setPostStatus(p, status);
      posts.reload();
    } catch (err) {
      setError(explainError(err));
    }
  }

  return (
    <>
      <div className="admin__head">
        <h1 className="admin__title">Publicaciones</h1>
        <Link to="/admin/publicaciones/nueva" className="btn btn--primary">Nueva publicación</Link>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {posts.loading ? (
        <Spinner />
      ) : posts.error ? (
        <ErrorState message={posts.error} onRetry={posts.reload} />
      ) : (posts.data ?? []).length === 0 ? (
        <EmptyState title="Aún no hay publicaciones">Crea la primera con «Nueva publicación».</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Título</th><th>Proyecto</th><th>Estado</th><th>Fecha</th><th><span className="visually-hidden">Acciones</span></th></tr>
            </thead>
            <tbody>
              {(posts.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td>{p.projects?.title ?? '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{formatDate(p.published_at ?? p.created_at)}</td>
                  <td className="table__actions">
                    <Link to={`/admin/publicaciones/${p.id}`} className="btn btn--outline btn--sm">Editar</Link>
                    {p.status !== 'published' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(p, 'published')}>Publicar</button>}
                    {p.status === 'published' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(p, 'draft')}>A borrador</button>}
                    {p.status !== 'archived' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(p, 'archived')}>Archivar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
