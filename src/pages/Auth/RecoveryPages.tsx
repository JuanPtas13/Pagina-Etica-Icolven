import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { explainError } from '../../lib/errors';
import { Alert, Spinner } from '../../components/ui/States';
import { AuthShell } from './AuthShell';

/** Destino del enlace de confirmación de correo. supabase-js procesa el enlace automáticamente al cargar. */
export function AuthCallbackPage() {
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // El disparador activa el perfil al confirmar el correo; se vuelve a consultar para reflejarlo.
      void refreshProfile().finally(() => navigate('/', { replace: true }));
    }
  }, [loading, user, navigate, refreshProfile]);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <AuthShell title="Confirmando tu correo…">
      {timedOut && !user ? (
        <>
          <Alert kind="warning">
            No pudimos completar la confirmación. El enlace pudo haber expirado o ya haberse usado.
          </Alert>
          <p className="auth__foot"><Link to="/iniciar-sesion">Iniciar sesión</Link> · <Link to="/registro">Volver a registrarme</Link></p>
        </>
      ) : (
        <Spinner label="Un momento…" />
      )}
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Escribe tu correo electrónico.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva contraseña.">
      {sent ? (
        <Alert kind="success">Si el correo está registrado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="form">
          <div className="field">
            <label htmlFor="fp-email" className="label">Correo electrónico</label>
            <input id="fp-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
      )}
      <p className="auth__foot"><Link to="/iniciar-sesion">Volver a iniciar sesión</Link></p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { user, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      await signOut();
      window.setTimeout(() => navigate('/iniciar-sesion', { replace: true }), 1800);
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AuthShell title="Nueva contraseña"><Spinner /></AuthShell>;
  if (!user) {
    return (
      <AuthShell title="Enlace no válido">
        <Alert kind="warning">El enlace de recuperación expiró o no es válido. Solicita uno nuevo.</Alert>
        <p className="auth__foot"><Link to="/recuperar">Solicitar otro enlace</Link></p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Nueva contraseña">
      {done ? (
        <Alert kind="success">Contraseña actualizada. Te llevamos a iniciar sesión…</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="form">
          <div className="field">
            <label htmlFor="np" className="label">Nueva contraseña</label>
            <input id="np" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="np2" className="label">Confirmar contraseña</label>
            <input id="np2" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
      )}
    </AuthShell>
  );
}
