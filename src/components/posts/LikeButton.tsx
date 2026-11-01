import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLike, countLikes, hasLiked, removeLike } from '../../services/participation';
import { explainError } from '../../lib/errors';

export function LikeButton({ postId, fallbackCount }: { postId: string; fallbackCount?: number }) {
  const { user, canParticipate, profile } = useAuth();
  const [count, setCount] = useState<number | null>(fallbackCount ?? null);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    const c = await countLikes(postId);
    if (c !== null) setCount(c);
  }, [postId]);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    let cancelled = false;
    void refreshCount();
    hasLiked(postId, user.id)
      .then((v) => {
        if (!cancelled) setLiked(v);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMessage(explainError(err, 'No se pudo consultar tu reacción.'));
      });
    return () => {
      cancelled = true;
    };
  }, [postId, user, refreshCount]);

  async function toggle() {
    setMessage(null);
    if (!user) {
      setMessage('login');
      return;
    }
    if (!canParticipate) {
      setMessage(profile?.status === 'suspended' ? 'Tu cuenta está suspendida y no puede reaccionar.' : 'Confirma tu correo electrónico para poder dar «Me gusta».');
      return;
    }
    setBusy(true);
    try {
      // Sin actualización optimista: el estado solo cambia cuando el servidor confirma la operación.
      if (liked) await removeLike(postId, user.id);
      else await addLike(postId, user.id);
      setLiked(!liked);
      await refreshCount();
    } catch (err) {
      setMessage(explainError(err, 'No se pudo actualizar tu reacción.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="like">
      <button
        type="button"
        className={`like__btn ${liked ? 'is-liked' : ''}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? 'Quitar me gusta' : 'Dar me gusta'}
      >
        <Heart size={20} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />
        {count !== null && <span>{count}</span>}
      </button>
      {message === 'login' ? (
        <p className="form-hint" role="status">
          <Link to="/iniciar-sesion">Inicia sesión</Link> o <Link to="/registro">crea una cuenta</Link> y confirma tu correo para dar «Me gusta».
        </p>
      ) : (
        message && <p className="form-hint form-hint--error" role="alert">{message}</p>
      )}
    </div>
  );
}
