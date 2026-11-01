import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { addComment, deleteOwnComment, listVisibleComments, MAX_COMMENT_LENGTH, validateComment } from '../../services/participation';
import { explainError } from '../../lib/errors';
import { formatDate } from '../../utils/format';
import { Alert, ErrorState, Spinner } from '../ui/States';

export function CommentSection({ postId }: { postId: string }) {
  const { user, profile, canParticipate, emailConfirmed } = useAuth();
  const comments = useAsync(() => listVisibleComments(postId), [postId]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const problem = validateComment(body);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setSending(true);
    try {
      await addComment(postId, user.id, body);
      setBody('');
      comments.reload();
    } catch (err) {
      setFormError(explainError(err, 'No se pudo publicar tu comentario.'));
    } finally {
      setSending(false);
    }
  }

  async function onDelete(id: string) {
    if (!user) return;
    if (!window.confirm('¿Eliminar tu comentario? Esta acción no se puede deshacer.')) return;
    setActionError(null);
    try {
      await deleteOwnComment(id, user.id);
      comments.reload();
    } catch (err) {
      setActionError(explainError(err, 'No se pudo eliminar el comentario.'));
    }
  }

  const remaining = MAX_COMMENT_LENGTH - body.length;
  const list = comments.data ?? [];

  return (
    <section className="comments" aria-labelledby="comentarios-titulo">
      <h2 id="comentarios-titulo" className="section-title section-title--sm">Comentarios ({list.length})</h2>

      {!user && (
        <Alert kind="info">
          <Link to="/iniciar-sesion">Inicia sesión</Link> o <Link to="/registro">crea una cuenta</Link> y confirma tu correo para comentar.
        </Alert>
      )}
      {user && !canParticipate && (
        <Alert kind={profile?.status === 'suspended' ? 'error' : 'warning'}>
          {profile?.status === 'suspended'
            ? 'Tu cuenta está suspendida: no puedes comentar.'
            : !emailConfirmed || profile?.status === 'pending'
              ? 'Tu cuenta está pendiente. Confirma tu correo electrónico para poder comentar.'
              : 'No se pudo verificar tu cuenta para comentar. Recarga la página e inténtalo de nuevo.'}
        </Alert>
      )}

      {canParticipate && (
        <form className="comment-form" onSubmit={onSubmit} noValidate>
          <label htmlFor="nuevo-comentario" className="label">Escribe un comentario respetuoso</label>
          <textarea
            id="nuevo-comentario"
            className="input textarea"
            rows={3}
            value={body}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby="contador-comentario"
            aria-invalid={Boolean(formError)}
            disabled={sending}
          />
          <div className="comment-form__row">
            <span id="contador-comentario" className={`counter ${remaining < 100 ? 'counter--warn' : ''}`} aria-live="polite">
              {body.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button type="submit" className="btn btn--primary" disabled={sending || body.trim().length === 0}>
              {sending ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
          {formError && <p className="form-hint form-hint--error" role="alert">{formError}</p>}
        </form>
      )}

      {actionError && <Alert kind="error">{actionError}</Alert>}

      {comments.loading ? (
        <Spinner label="Cargando comentarios…" />
      ) : comments.error ? (
        <ErrorState message={comments.error} onRetry={comments.reload} />
      ) : list.length === 0 ? (
        <p className="muted">Aún no hay comentarios. ¡Sé la primera persona en participar!</p>
      ) : (
        <ul className="comment-list">
          {list.map((c) => (
            <li key={c.id} className="comment">
              <span className="avatar" aria-hidden="true">{c.author_name.charAt(0).toUpperCase()}</span>
              <div className="comment__main">
                <p className="comment__head">
                  <strong>{c.author_name}</strong> <time dateTime={c.created_at}>{formatDate(c.created_at)}</time>
                </p>
                {/* Texto plano: React lo escapa; nunca se usa dangerouslySetInnerHTML */}
                <p className="comment__body">{c.body}</p>
              </div>
              {user?.id === c.user_id && canParticipate && (
                <button type="button" className="icon-btn" onClick={() => void onDelete(c.id)} aria-label="Eliminar mi comentario">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
