import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/proyectos': 'Proyectos',
  '/etica': 'Ética',
  '/filosofia': 'Filosofía',
  '/gabinete': 'Gabinete',
  '/acerca-de': 'Nuestra filosofía',
  '/publicaciones': 'Publicaciones',
  '/iniciar-sesion': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
  '/recuperar': 'Recuperar contraseña',
  '/restablecer': 'Nueva contraseña',
  '/auth/callback': 'Confirmación de correo',
  '/admin': 'Administración',
  '/admin/proyectos': 'Administrar proyectos',
  '/admin/publicaciones': 'Administrar publicaciones',
  '/admin/publicaciones/nueva': 'Nueva publicación',
  '/admin/categorias': 'Administrar categorías',
  '/admin/comentarios': 'Administrar comentarios',
  '/admin/usuarios': 'Administrar usuarios',
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/proyectos/')) return 'Proyecto';
  if (pathname.startsWith('/publicaciones/')) return 'Publicación';
  if (/^\/admin\/publicaciones\/[^/]+$/.test(pathname)) return 'Editar publicación';
  return 'Página no encontrada';
}

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${getTitle(pathname)} · Divergente · ICOLVEN`;
  }, [pathname]);

  return null;
}
