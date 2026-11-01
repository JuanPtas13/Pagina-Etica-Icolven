import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { listAllComments, setCommentStatus } from '../../services/admin';
import { explainError } from '../../lib/errors';
import { formatDate } from '../../utils/format';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { StatusBadge } from './shared';
import type { CommentStatus } from '../../types/database';

const FILTERS: { value: CommentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'visible', label: 'Visibles' },
  { value: 'hidden', label: 'Ocultos' },
  { value: 'deleted', label: 'Eliminados' },
];

const PAGE_SIZE = 50;

export function CommentsAdminPage() {
  const [filter, setFilter] = useState<CommentStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const comments = useAsync(() => listAllComments(filter === 'all' ? undefined : filter, page, PAGE_SIZE), [filter, page]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const totalPages = Math.ceil((comments.data?.total ?? 0) / PAGE_SIZE);
    if (page > 0 && page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [comments.data?.total, page]);

  async function change(id: string, status: CommentStatus, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    try {
      await setCommentStatus(id, status);
      comments.reload();
    } catch (err) {
      setError(explainError(err));
    }
  }

  return (
    <>
      <h1 className="admin__title">Comentarios</h1>
      <p className="muted">
        Modera solo contenido abusivo, spam o que incumpla las normas de participación. Las críticas respetuosas deben permanecer visibles.
      </p>
      <div className="tabs" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className={`tab ${filter === f.value ? 'is-active' : ''}`} aria-pressed={filter === f.value} onClick={() => { setFilter(f.value); setPage(0); }}>
            {f.label}
          </button>
        ))}
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {comments.loading ? (
        <Spinner />
      ) : comments.error ? (
        <ErrorState message={comments.error} onRetry={comments.reload} />
      ) : (comments.data?.comments ?? []).length === 0 ? (
        <EmptyState title="No hay comentarios en esta vista" />
      ) : (
        <>
          <p className="muted">Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, comments.data?.total ?? 0)} de {comments.data?.total ?? 0} comentarios</p>
          <ul className="comment-admin">
            {(comments.data?.comments ?? []).map((c) => (
              <li key={c.id} className="panel">
                <p className="comment__head">
                  <strong>{c.author_name}</strong> en <Link to={`/publicaciones/${c.post_id}`}>{c.post_title}</Link> · {formatDate(c.created_at)} <StatusBadge status={c.status} />
                </p>
                <p className="comment__body">{c.body}</p>
                <div className="table__actions">
                  {c.status !== 'visible' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(c.id, 'visible')}>Restaurar</button>}
                  {c.status === 'visible' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(c.id, 'hidden')}>Ocultar</button>}
                  {c.status !== 'deleted' && (
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => void change(c.id, 'deleted', '¿Eliminar este comentario? Dejará de mostrarse públicamente.')}>
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {(comments.data?.total ?? 0) > PAGE_SIZE && (
            <div className="form__actions">
              <button type="button" className="btn btn--outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</button>
              <button type="button" className="btn btn--outline" disabled={(page + 1) * PAGE_SIZE >= (comments.data?.total ?? 0)} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
