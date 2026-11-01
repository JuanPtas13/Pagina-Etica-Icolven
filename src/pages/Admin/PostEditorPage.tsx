import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { listCategories } from '../../services/content';
import {
  addExternalMedia, deleteMedia, getPostForEdit, listAllProjects, savePost, updateMediaMeta, uploadPostMedia,
} from '../../services/admin';
import { explainError } from '../../lib/errors';
import { classifyMedia, safeExternalUrl, validateUpload } from '../../utils/media';
import { formatBytes } from '../../utils/format';
import { Alert, ErrorState, Spinner } from '../../components/ui/States';
import { MediaKindIcon } from '../../components/media/MediaGallery';
import { CONTENT_STATUS_OPTIONS } from './shared';
import type { ContentStatus, PostMedia } from '../../types/database';

interface UploadItem {
  key: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
  done?: boolean;
}

function MediaRow({ media, onChanged }: { media: PostMedia; onChanged: () => void }) {
  const [title, setTitle] = useState(media.title ?? '');
  const [alt, setAlt] = useState(media.alt_text ?? '');
  const [position, setPosition] = useState(media.position);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const kind = classifyMedia(media);

  async function save() {
    setMsg(null);
    try {
      await updateMediaMeta(media.id, { title, alt_text: alt, position });
      setMsg({ kind: 'success', text: 'Guardado.' });
      onChanged();
    } catch (err) {
      setMsg({ kind: 'error', text: explainError(err) });
    }
  }

  async function remove() {
    if (!window.confirm('¿Eliminar este archivo de la publicación? También se borrará del almacenamiento.')) return;
    try {
      await deleteMedia(media);
      onChanged();
    } catch (err) {
      setMsg({ kind: 'error', text: explainError(err) });
    }
  }

  return (
    <li className="media-row">
      <span className="media-row__kind"><MediaKindIcon kind={kind} /> {kind === 'image' ? 'Imagen' : kind === 'video' ? 'Video' : kind === 'link' ? 'Enlace' : 'Documento'}</span>
      <div className="media-row__fields">
        <label className="label" htmlFor={`mt-${media.id}`}>Título</label>
        <input id={`mt-${media.id}`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        {kind === 'image' && (
          <>
            <label className="label" htmlFor={`ma-${media.id}`}>Texto alternativo (describe la imagen)</label>
            <input id={`ma-${media.id}`} className="input" value={alt} onChange={(e) => setAlt(e.target.value)} />
          </>
        )}
        <label className="label" htmlFor={`mp-${media.id}`}>Posición</label>
        <input id={`mp-${media.id}`} type="number" className="input input--narrow" value={position} min={0} onChange={(e) => setPosition(Number(e.target.value) || 0)} />
        {media.external_url && <small className="muted">{media.external_url}</small>}
        {msg && <p className={`form-hint ${msg.kind === 'error' ? 'form-hint--error' : ''}`} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      </div>
      <div className="media-row__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => void save()}>Guardar</button>
        <button type="button" className="icon-btn" onClick={() => void remove()} aria-label="Eliminar archivo"><Trash2 size={16} /></button>
      </div>
    </li>
  );
}

function MediaManager({ postId, media, reload }: { postId: string; media: PostMedia[]; reload: () => void }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [extUrl, setExtUrl] = useState('');
  const [extTitle, setExtTitle] = useState('');
  const [extError, setExtError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextPosition = useMemo(() => (media.length ? Math.max(...media.map((m) => m.position)) + 1 : 0), [media]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const items: UploadItem[] = list.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, size: f.size, progress: 0, error: validateUpload(f) ?? undefined }));
    setUploads(items);
    setBusy(true);
    let position = nextPosition;
    for (let i = 0; i < list.length; i++) {
      if (items[i].error) continue;
      try {
        await uploadPostMedia(postId, list[i], position++, (f) => setUploads((cur) => cur.map((u, idx) => (idx === i ? { ...u, progress: f } : u))));
        setUploads((cur) => cur.map((u, idx) => (idx === i ? { ...u, progress: 1, done: true } : u)));
      } catch (err) {
        setUploads((cur) => cur.map((u, idx) => (idx === i ? { ...u, error: explainError(err, 'No se pudo subir el archivo.') } : u)));
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    reload();
  }

  async function onAddLink(e: FormEvent) {
    e.preventDefault();
    setExtError(null);
    const parsed = safeExternalUrl(extUrl);
    if (!parsed) {
      setExtError('Escribe un enlace válido que empiece por https://');
      return;
    }
    try {
      const isVideo = /youtube\.com|youtu\.be|vimeo\.com/.test(parsed.hostname);
      await addExternalMedia(postId, parsed.toString(), extTitle, isVideo ? 'video' : 'link', nextPosition);
      setExtUrl('');
      setExtTitle('');
      reload();
    } catch (err) {
      setExtError(explainError(err));
    }
  }

  return (
    <section className="panel" aria-labelledby="media-title">
      <h2 id="media-title" className="section-title section-title--sm">Archivos multimedia</h2>
      <div className="field">
        <label htmlFor="files" className="label">Subir archivos (imágenes, videos MP4/WEBM, PDF, Word, PowerPoint, Excel · máx. 50 MB cada uno)</label>
        <input id="files" ref={inputRef} type="file" multiple className="input" disabled={busy} onChange={(e) => void onFiles(e.target.files)} />
      </div>
      {uploads.length > 0 && (
        <ul className="uploads" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key}>
              <span>{u.name} <small className="muted">({formatBytes(u.size)})</small></span>
              {u.error ? <span className="form-hint form-hint--error">{u.error}</span> : u.done ? <span className="badge badge--ok">Subido</span> : <progress value={u.progress} max={1} aria-label={`Subiendo ${u.name}`} />}
            </li>
          ))}
        </ul>
      )}

      <form className="form form--inline" onSubmit={onAddLink} noValidate>
        <div className="field">
          <label htmlFor="ext-url" className="label">…o agrega un enlace (YouTube, Vimeo u otro sitio)</label>
          <input id="ext-url" className="input" value={extUrl} onChange={(e) => setExtUrl(e.target.value)} placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="ext-title" className="label">Título del enlace</label>
          <input id="ext-title" className="input" value={extTitle} onChange={(e) => setExtTitle(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--outline">Agregar enlace</button>
      </form>
      {extError && <Alert kind="error">{extError}</Alert>}

      {media.length === 0 ? (
        <p className="muted">Esta publicación aún no tiene archivos. Las publicaciones sin multimedia son válidas.</p>
      ) : (
        <ul className="media-rows">
          {[...media].sort((a, b) => a.position - b.position).map((m) => <MediaRow key={m.id} media={m} onChanged={reload} />)}
        </ul>
      )}
    </section>
  );
}

export function PostEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [newId] = useState(() => crypto.randomUUID());
  const postId = id ?? newId;

  const post = useAsync(() => (isNew ? Promise.resolve(null) : getPostForEdit(postId)), [postId, isNew]);
  const projects = useAsync(listAllProjects, []);
  const categories = useAsync(() => listCategories().catch(() => []), []);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (post.data) {
      setTitle(post.data.title);
      setBody(post.data.body ?? '');
      setProjectId(post.data.project_id);
      setCategoryId(post.data.category_id ?? '');
      setStatus(post.data.status);
    }
  }, [post.data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await savePost(
        { id: postId, isNew, project_id: projectId, category_id: categoryId || null, title, body, status },
        user.id,
        post.data?.status,
      );
      if (isNew) {
        navigate(`/admin/publicaciones/${postId}`, { replace: true });
      } else {
        setMessage({ kind: 'success', text: 'Publicación guardada.' });
        post.reload();
      }
    } catch (err) {
      setMessage({ kind: 'error', text: explainError(err, 'No se pudo guardar la publicación.') });
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && post.loading) return <Spinner />;
  if (!isNew && post.error) return <ErrorState message={post.error} onRetry={post.reload} />;
  if (!isNew && !post.data) return <Alert kind="error">No se encontró la publicación.</Alert>;

  return (
    <>
      <Link to="/admin/publicaciones" className="back-link back-link--dark"><ArrowLeft size={16} aria-hidden="true" /> Volver a publicaciones</Link>
      <h1 className="admin__title">{isNew ? 'Nueva publicación' : 'Editar publicación'}</h1>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}

      <form className="panel form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="po-title" className="label">Título</label>
          <input id="po-title" className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="po-body" className="label">Contenido (texto; separa los párrafos con una línea en blanco)</label>
          <textarea id="po-body" className="input textarea" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="form__cols">
          <div className="field">
            <label htmlFor="po-project" className="label">Proyecto</label>
            <select id="po-project" className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Selecciona un proyecto…</option>
              {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="po-cat" className="label">Categoría (opcional)</label>
            <select id="po-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="po-status" className="label">Estado</label>
            <select id="po-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
              {CONTENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {projects.error && <Alert kind="error">{projects.error}</Alert>}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : isNew ? 'Crear publicación' : 'Guardar cambios'}</button>
        </div>
      </form>

      {isNew ? (
        <Alert kind="info">Guarda la publicación para poder adjuntar archivos multimedia.</Alert>
      ) : (
        <MediaManager postId={postId} media={post.data?.post_media ?? []} reload={post.reload} />
      )}
    </>
  );
}
