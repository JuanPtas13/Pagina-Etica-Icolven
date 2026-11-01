import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { explainError } from '../../lib/errors';
import { Alert } from '../../components/ui/States';
import { AuthShell } from './AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const { signUp, resendConfirmation } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Escribe tu nombre (mínimo 2 caracteres).';
    if (name.trim().length > 60) e.name = 'El nombre es demasiado largo.';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Escribe un correo electrónico válido.';
    if (password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (confirm !== password) e.confirm = 'Las contraseñas no coinciden.';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      setSentTo(needsConfirmation ? email.trim() : null);
      if (!needsConfirmation) setFormError(null);
    } catch (err) {
      setFormError(explainError(err, 'No se pudo crear la cuenta.'));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!sentTo) return;
    setResendMsg(null);
    try {
      await resendConfirmation(sentTo);
      setResendMsg('Correo reenviado. Revisa tu bandeja de entrada y la carpeta de spam.');
    } catch (err) {
      setResendMsg(explainError(err));
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Revisa tu correo" subtitle={`Enviamos un enlace de confirmación a ${sentTo}.`}>
        <p>Abre el enlace del mensaje para activar tu cuenta. Hasta entonces podrás leer el contenido, pero no comentar ni dar «Me gusta».</p>
        <button type="button" className="btn btn--outline" onClick={onResend}>Reenviar correo</button>
        {resendMsg && <Alert kind="info">{resendMsg}</Alert>}
        <p className="auth__foot"><Link to="/iniciar-sesion">Ir a iniciar sesión</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Solo necesitamos lo básico. Después deberás confirmar tu correo electrónico.">
      <form onSubmit={onSubmit} noValidate className="form">
        <div className="field">
          <label htmlFor="name" className="label">Nombre visible</label>
          <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'err-name' : undefined} />
          {errors.name && <p id="err-name" className="form-hint form-hint--error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="reg-email" className="label">Correo electrónico</label>
          <input id="reg-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'err-email' : undefined} />
          {errors.email && <p id="err-email" className="form-hint form-hint--error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="reg-pass" className="label">Contraseña</label>
          <input id="reg-pass" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby="hint-pass" />
          <p id="hint-pass" className={`form-hint ${errors.password ? 'form-hint--error' : ''}`}>{errors.password ?? 'Mínimo 8 caracteres.'}</p>
        </div>
        <div className="field">
          <label htmlFor="reg-confirm" className="label">Confirmar contraseña</label>
          <input id="reg-confirm" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'err-confirm' : undefined} />
          {errors.confirm && <p id="err-confirm" className="form-hint form-hint--error">{errors.confirm}</p>}
        </div>
        {formError && <Alert kind="error">{formError}</Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="auth__foot">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
    </AuthShell>
  );
}
