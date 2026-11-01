import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { listProfiles, setMemberStatus } from '../../services/admin';
import { explainError } from '../../lib/errors';
import { formatDate } from '../../utils/format';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { StatusBadge } from './shared';
import type { Profile } from '../../types/database';

export function UsersAdminPage() {
  const { user } = useAuth();
  const profiles = useAsync(listProfiles, []);
  const [error, setError] = useState<string | null>(null);

  async function toggle(p: Profile) {
    if (!user) return;
    const next = p.status === 'suspended' ? 'active' : 'suspended';
    const name = p.display_name ?? 'este usuario';
    const text = next === 'suspended'
      ? `¿Suspender a ${name}? No podrá comentar ni dar «Me gusta». Su historial se conserva.`
      : `¿Reactivar a ${name}?`;
    if (!window.confirm(text)) return;
    setError(null);
    try {
      await setMemberStatus(p, next, user.id);
      profiles.reload();
    } catch (err) {
      setError(explainError(err));
    }
  }

  return (
    <>
      <h1 className="admin__title">Usuarios</h1>
      <p className="muted">Los perfiles pendientes se activan solos cuando la persona confirma su correo.</p>
      {error && <Alert kind="error">{error}</Alert>}
      {profiles.loading ? (
        <Spinner />
      ) : profiles.error ? (
        <ErrorState message={profiles.error} onRetry={profiles.reload} />
      ) : (profiles.data ?? []).length === 0 ? (
        <EmptyState title="No hay usuarios registrados" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Registro</th><th><span className="visually-hidden">Acciones</span></th></tr>
            </thead>
            <tbody>
              {(profiles.data ?? []).map((p) => {
                const isSelf = p.id === user?.id;
                const locked = isSelf || p.role === 'teacher' || p.status === 'pending';
                return (
                  <tr key={p.id}>
                    <td><strong>{p.display_name ?? 'Sin nombre'}</strong>{isSelf && <small className="muted"> (tú)</small>}</td>
                    <td>{p.role === 'teacher' ? 'Profesor' : 'Miembro'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{formatDate(p.created_at)}</td>
                    <td className="table__actions">
                      <button type="button" className="btn btn--outline btn--sm" disabled={locked} onClick={() => void toggle(p)}>
                        {p.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
