import { useState, type FormEvent } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { listCategories } from '../../services/content';
import { deleteCategory, saveCategory } from '../../services/admin';
import { explainError } from '../../lib/errors';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { getProjectArea } from '../../utils/projectAreas';

export function CategoriesAdminPage() {
  const categories = useAsync(listCategories, []);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await saveCategory({ id: editingId ?? undefined, name });
      setName('');
      setEditingId(null);
      setMessage({ kind: 'success', text: 'Categoría guardada.' });
      categories.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: explainError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!window.confirm(`¿Eliminar la categoría «${label}»? Si está en uso, la base de datos lo impedirá.`)) return;
    setMessage(null);
    try {
      await deleteCategory(id);
      categories.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: explainError(err) });
    }
  }

  return (
    <>
      <h1 className="admin__title">Categorías</h1>
      <p className="muted">Las áreas generales de proyectos (Ética, Filosofía y Gabinete) se asignan desde Proyectos. Aquí puedes administrar las demás categorías.</p>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <form className="form form--inline panel" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="cat-name" className="label">{editingId ? 'Editar nombre' : 'Nueva categoría'}</label>
          <input id="cat-name" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>{editingId ? 'Guardar' : 'Crear'}</button>
        {editingId && <button type="button" className="btn btn--outline" onClick={() => { setEditingId(null); setName(''); }}>Cancelar</button>}
      </form>

      {categories.loading ? (
        <Spinner />
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.reload} />
      ) : (categories.data ?? []).length === 0 ? (
        <EmptyState title="No hay categorías">Las áreas generales se crean al asignarlas a un proyecto. Puedes crear aquí otras categorías para organizar publicaciones.</EmptyState>
      ) : (
        <ul className="list-rows">
          {(categories.data ?? []).map((c) => (
            <li key={c.id}>
              <span className="list-rows__main">
                <strong>{c.name}</strong>
                {getProjectArea(c.name) && <small className="muted">Área general; se asigna desde Proyectos.</small>}
              </span>
              {!getProjectArea(c.name) && (
                <>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => { setEditingId(c.id); setName(c.name); }}>Editar</button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => void onDelete(c.id, c.name)}>Eliminar</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
