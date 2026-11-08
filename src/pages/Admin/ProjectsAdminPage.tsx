import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { listCategories } from '../../services/content';
import { listAllProjects, saveProject, setProjectStatus, uploadProjectCover } from '../../services/admin';
import { explainError } from '../../lib/errors';
import { countOf, slugify } from '../../utils/format';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { SignedImage } from '../../components/media/SignedImage';
import { CONTENT_STATUS_OPTIONS, StatusBadge } from './shared';
import type { ContentStatus, Project } from '../../types/database';
import { getProjectArea, PROJECT_AREAS, type ProjectArea } from '../../utils/projectAreas';

interface FormState {
  id?: string;
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  status: ContentStatus;
  area: ProjectArea | '';
  categoryId: string | null;
  areaChanged: boolean;
  cover_path: string | null;
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  slugTouched: false,
  description: '',
  status: 'draft',
  area: '',
  categoryId: null,
  areaChanged: false,
  cover_path: null,
};

export function ProjectsAdminPage() {
  const { user } = useAuth();
  const projects = useAsync(listAllProjects, []);
  const categories = useAsync(listCategories, []);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function edit(p: Project) {
    setMessage(null);
    const categoryName = categories.data?.find((category) => category.id === p.category_id)?.name;
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      slugTouched: true,
      description: p.description ?? '',
      status: p.status,
      area: getProjectArea(categoryName),
      categoryId: p.category_id,
      areaChanged: false,
      cover_path: p.cover_path,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    const currentlyPublished = form.id && projects.data?.some((project) => project.id === form.id && project.status === 'published');
    if (currentlyPublished && form.status !== 'published'
      && !window.confirm('Al pasar este proyecto a borrador, también pasarán a borrador sus publicaciones que no estén ya en borrador. ¿Continuar?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveProject(
        {
          id: form.id,
          title: form.title,
          slug: form.slug,
          description: form.description,
          status: form.status,
          area: form.areaChanged || !form.id ? form.area || null : undefined,
          category_id: form.categoryId,
        },
        user.id,
      );
      // La portada requiere el UUID del proyecto como primera carpeta de la ruta.
      const file = fileRef.current?.files?.[0];
      if (file) {
        setProgress(0);
        await uploadProjectCover(saved.id, file, form.cover_path, setProgress);
      }
      setMessage({ kind: 'success', text: 'Proyecto guardado.' });
      setForm(null);
      projects.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: explainError(err, 'No se pudo guardar el proyecto.') });
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function changeStatus(p: Project, status: ContentStatus) {
    const verb = status === 'archived' ? 'archivar' : status === 'published' ? 'publicar' : 'pasar a borrador';
    const impact = status !== 'published'
      ? ' Sus publicaciones publicadas también pasarán a borrador.'
      : '';
    if (!window.confirm(`¿Seguro que quieres ${verb} el proyecto «${p.title}»?${impact}`)) return;
    setMessage(null);
    try {
      const draftedPosts = await setProjectStatus(p.id, status);
      if (draftedPosts > 0) {
        setMessage({ kind: 'success', text: `Proyecto actualizado. ${draftedPosts} ${draftedPosts === 1 ? 'publicación publicada pasó' : 'publicaciones publicadas pasaron'} a borrador.` });
      }
      projects.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: explainError(err) });
    }
  }

  return (
    <>
      <div className="admin__head">
        <h1 className="admin__title">Proyectos</h1>
        {!form && <button type="button" className="btn btn--primary" onClick={() => { setMessage(null); setForm({ ...EMPTY }); }}>Nuevo proyecto</button>}
      </div>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      {categories.error && <ErrorState message={categories.error} onRetry={categories.reload} />}

      {form && (
        <form className="panel form" onSubmit={onSubmit} noValidate>
          <h2 className="section-title section-title--sm">{form.id ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
          <div className="field">
            <label htmlFor="p-title" className="label">Título</label>
            <input id="p-title" className="input" value={form.title} maxLength={120}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slugTouched ? form.slug : slugify(e.target.value) })} />
          </div>
          <div className="field">
            <label htmlFor="p-slug" className="label">Slug (dirección web)</label>
            <input id="p-slug" className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase(), slugTouched: true })} aria-describedby="p-slug-hint" />
            <p id="p-slug-hint" className="form-hint">Solo minúsculas, números y guiones. Debe ser único.</p>
          </div>
          <div className="field">
            <label htmlFor="p-desc" className="label">Descripción</label>
            <textarea id="p-desc" className="input textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form__cols">
            <div className="field">
              <label htmlFor="p-area" className="label">Área general (opcional)</label>
              <select id="p-area" className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value as ProjectArea | '', areaChanged: true })}>
                <option value="">Sin área</option>
                {PROJECT_AREAS.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}
              </select>
              <p className="form-hint">El proyecto aparecerá en la sección seleccionada. Si no eliges un área, solo aparecerá en Proyectos.</p>
              {form.id && form.categoryId && !form.area && (
                <p className="form-hint">La asignación actual se conservará si no cambias esta selección.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="p-status" className="label">Estado</label>
              <select id="p-status" className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
                {CONTENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-cover" className="label">Portada (JPG, PNG o WEBP, máx. 50 MB)</label>
            {form.cover_path && <SignedImage path={form.cover_path} alt="Portada actual del proyecto" className="cover-preview" />}
            <input id="p-cover" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="input" />
            {progress !== null && <progress value={progress} max={1} aria-label="Progreso de subida de la portada" />}
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar proyecto'}</button>
            <button type="button" className="btn btn--outline" onClick={() => setForm(null)} disabled={saving}>Cancelar</button>
          </div>
        </form>
      )}

      {projects.loading ? (
        <Spinner />
      ) : projects.error ? (
        <ErrorState message={projects.error} onRetry={projects.reload} />
      ) : (projects.data ?? []).length === 0 ? (
        <EmptyState title="Aún no hay proyectos">Crea el primero con «Nuevo proyecto».</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Proyecto</th><th>Área</th><th>Estado</th><th>Publicaciones</th><th><span className="visually-hidden">Acciones</span></th></tr>
            </thead>
            <tbody>
              {(projects.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong><br /><small className="muted">/{p.slug}</small></td>
                  <td>{categories.data?.find((category) => category.id === p.category_id)?.name ?? '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{countOf(p.posts)}</td>
                  <td className="table__actions">
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => edit(p)}>Editar</button>
                    {p.status !== 'published' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void changeStatus(p, 'published')}>Publicar</button>}
                    {p.status === 'published' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void changeStatus(p, 'draft')}>A borrador</button>}
                    {p.status !== 'archived' && <button type="button" className="btn btn--outline btn--sm" onClick={() => void changeStatus(p, 'archived')}>Archivar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
