import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, Home, LogOut, Menu, MessageSquare, Tags, Users, X, Globe } from 'lucide-react';
import { Brand } from '../ui/Brand';
import { useAuth } from '../../contexts/AuthContext';

const ITEMS = [
  { to: '/admin', label: 'Inicio', icon: Home, end: true },
  { to: '/admin/proyectos', label: 'Proyectos', icon: FolderOpen },
  { to: '/admin/publicaciones', label: 'Publicaciones', icon: FileText },
  { to: '/admin/categorias', label: 'Categorías', icon: Tags },
  { to: '/admin/comentarios', label: 'Comentarios', icon: MessageSquare },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="admin">
      <a href="#contenido-admin" className="skip-link">Saltar al contenido</a>
      <aside className={`admin__sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin__brand">
          <Brand to="/admin" />
        </div>
        <nav aria-label="Administración" className="admin__nav">
          {ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `admin__link ${isActive ? 'is-active' : ''}`}>
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          <NavLink to="/" className="admin__link">
            <Globe size={18} aria-hidden="true" /> Ver sitio público
          </NavLink>
        </nav>
        <button type="button" className="admin__link admin__logout" onClick={handleSignOut}>
          <LogOut size={18} aria-hidden="true" /> Cerrar sesión
        </button>
      </aside>
      <div className="admin__main">
        <header className="admin__top">
          <button type="button" className="admin__toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="admin__who">
            <span className="avatar" aria-hidden="true">{(profile?.display_name ?? 'P').charAt(0).toUpperCase()}</span>
            <span>
              <strong>{profile?.display_name ?? 'Profesor'}</strong>
              <small>Profesor</small>
            </span>
          </div>
        </header>
        <main id="contenido-admin" tabIndex={-1} className="admin__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
