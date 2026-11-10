import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, Settings, X } from 'lucide-react';
import { Brand } from '../ui/Brand';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../ui/States';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/proyectos', label: 'Proyectos' },
  { to: '/publicaciones', label: 'Publicaciones' },
  { to: '/etica', label: 'Ética' },
  { to: '/filosofia', label: 'Filosofía' },
  { to: '/gabinete', label: 'Gabinete' },
];

function AccountBanner() {
  const { user, profile, emailConfirmed, profileError } = useAuth();
  if (!user) return null;
  if (profileError) return <Alert kind="warning">{profileError}</Alert>;
  if (!emailConfirmed || profile?.status === 'pending') {
    return (
      <Alert kind="warning">
        Tu cuenta está pendiente: confirma tu correo electrónico para poder comentar y dar «Me gusta».
      </Alert>
    );
  }
  if (profile?.status === 'suspended') {
    return <Alert kind="error">Tu cuenta está suspendida. Puedes seguir leyendo, pero no comentar ni reaccionar.</Alert>;
  }
  return null;
}

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, profile, isTeacher, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="site">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="header">
        <div className="container header__inner">
          <Brand />
          <button
            type="button"
            className="header__toggle"
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
          <nav id="menu-principal" className={`nav ${open ? 'nav--open' : ''}`} aria-label="Principal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/publicaciones" className="nav__icon" aria-label="Buscar publicaciones">
              <Search size={18} aria-hidden="true" />
            </Link>
            <div className="nav__account">
              {loading ? null : user ? (
                <>
                  {isTeacher && (
                    <Link to="/admin" className="btn btn--pill btn--light">
                      <Settings size={16} aria-hidden="true" /> Panel
                    </Link>
                  )}
                  <span className="nav__user" title={user.email ?? ''}>{profile?.display_name ?? 'Mi cuenta'}</span>
                  <button type="button" className="btn btn--pill btn--ghost" onClick={handleSignOut}>
                    <LogOut size={16} aria-hidden="true" /> Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/registro" className="nav__link">Crear cuenta</Link>
                  <Link to="/iniciar-sesion" className="btn btn--pill btn--light">Iniciar sesión</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <div className="container">
        <AccountBanner />
      </div>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <Brand />
          <nav className="footer__links" aria-label="Pie de página">
            <Link to="/acerca-de">Acerca de</Link>
            <Link to="/proyectos">Proyectos</Link>
            <Link to="/publicaciones">Publicaciones</Link>
          </nav>
          <div className="footer__school">
            <img src="/logo-icolven.jpg" alt="Colegio Adventista ICOLVEN, Medellín - Colombia" />
            <span>Colegio Adventista<br /><strong>ICOLVEN</strong></span>
          </div>
          <p className="footer__signature">Made by Juan José Pinzón</p>
          <p className="footer__legal">Colegio Adventista ICOLVEN · Educación con propósito</p>
        </div>
      </footer>
    </div>
  );
}
