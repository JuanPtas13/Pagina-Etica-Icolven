import { Link } from 'react-router-dom';
import { FileText, FolderOpen, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getDashboardCounts, listAllPosts } from '../../services/admin';
import { ErrorState, Spinner, EmptyState } from '../../components/ui/States';
import { formatDate } from '../../utils/format';
import { StatusBadge } from './shared';

export function DashboardPage() {
  const { profile } = useAuth();
  const counts = useAsync(getDashboardCounts, []);
  const posts = useAsync(listAllPosts, []);

  const stats = [
    { label: 'Proyectos', value: counts.data?.projects, icon: FolderOpen },
    { label: 'Publicaciones', value: counts.data?.posts, icon: FileText },
    { label: 'Comentarios visibles', value: counts.data?.comments, icon: MessageSquare },
    { label: 'Usuarios activos', value: counts.data?.activeUsers, icon: Users },
  ];

  return (
    <>
      <h1 className="admin__title">Hola, {profile?.display_name ?? 'Profesor'}</h1>
      <p className="muted">Aquí tienes un resumen de la actividad en Divergente.</p>

      {counts.error ? (
        <ErrorState message={counts.error} onRetry={counts.reload} />
      ) : (
        <div className="stats">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat">
              <Icon size={22} aria-hidden="true" />
              <span className="stat__label">{label}</span>
              <strong className="stat__value">{counts.loading || value === undefined ? '—' : value}</strong>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title section-title--sm">Accesos rápidos</h2>
      <div className="quick">
        <Link to="/admin/proyectos" className="btn btn--primary">Crear proyecto</Link>
        <Link to="/admin/publicaciones/nueva" className="btn btn--primary">Nueva publicación</Link>
        <Link to="/admin/usuarios" className="btn btn--primary">Gestionar usuarios</Link>
        <Link to="/admin/comentarios" className="btn btn--outline">Moderar comentarios</Link>
      </div>

      <h2 className="section-title section-title--sm">Publicaciones recientes</h2>
      {posts.loading ? (
        <Spinner />
      ) : posts.error ? (
        <ErrorState message={posts.error} onRetry={posts.reload} />
      ) : (posts.data ?? []).length === 0 ? (
        <EmptyState title="Aún no hay publicaciones" action={<Link to="/admin/publicaciones/nueva" className="btn btn--primary">Crear la primera</Link>} />
      ) : (
        <ul className="list-rows">
          {(posts.data ?? []).slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link to={`/admin/publicaciones/${p.id}`} className="list-rows__main">
                <strong>{p.title}</strong>
                <small>Proyecto: {p.projects?.title ?? '—'}</small>
              </Link>
              <StatusBadge status={p.status} />
              <small>{formatDate(p.published_at ?? p.created_at)}</small>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
