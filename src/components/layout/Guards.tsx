import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorState, Spinner } from '../ui/States';

/**
 * Guardia de la ruta /admin. Es solo una comodidad de interfaz: los datos siguen protegidos por RLS.
 * Un error al consultar el perfil NO concede acceso.
 */
export function RequireTeacher({ children }: { children: ReactNode }) {
  const { user, loading, profileError, isTeacher, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <div className="container page"><Spinner label="Verificando permisos…" /></div>;
  if (!user) return <Navigate to="/iniciar-sesion" replace state={{ from: location.pathname }} />;
  if (profileError) return <div className="container page"><ErrorState message={profileError} onRetry={() => void refreshProfile()} /></div>;
  if (!isTeacher) {
    return (
      <div className="container page">
        <div className="state state--error" role="alert">
          <h1 className="section-title">Acceso restringido</h1>
          <p>Esta sección es exclusiva de la cuenta del profesor.</p>
          <Link to="/" className="btn btn--primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/** Redirige a usuarios ya autenticados fuera de las pantallas de login/registro. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container page"><Spinner /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
