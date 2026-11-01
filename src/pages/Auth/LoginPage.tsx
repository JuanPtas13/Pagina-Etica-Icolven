import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { explainError } from '../../lib/errors';
import { Alert } from '../../components/ui/States';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const { signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setUnconfirmed(false);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = explainError(err, 'No se pudo iniciar sesión.');
      setError(msg);
      if (msg.includes('confirmado tu correo')) setUnconfirmed(true);
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setInfo(null);
    try {
      await resendConfirmation(email);
      setInfo('Te enviamos de nuevo el correo de confirmación. Revisa también la carpeta de spam.');
    } catch (err) {
      setError(explainError(err));
    }
  }

  return (
    <AuthShell title="Bienvenido" subtitle="Inicia sesión para comentar, dar «Me gusta» y participar en la comunidad educativa.">
      <form onSubmit={onSubmit} noValidate className="form">
        <div className="field">
          <label htmlFor="email" className="label">Correo electrónico</label>
          <div className="input-wrap">
            <Mail size={16} aria-hidden="true" />
            <input id="email" type="email" className="input" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="password" className="label">Contraseña</label>
          <div className="input-wrap">
            <input id="password" type={show ? 'text' : 'password'} className="input" autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form__row">
          <span className="muted">Tu sesión se mantiene al recargar la página.</span>
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {unconfirmed && (
          <button type="button" className="btn btn--outline" onClick={onResend} disabled={!email.trim()}>
            Reenviar correo de confirmación
          </button>
        )}
        {info && <Alert kind="success">{info}</Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="auth__foot">¿No tienes una cuenta? <Link to="/registro">Crea una cuenta</Link></p>
    </AuthShell>
  );
}
