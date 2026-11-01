import type { CommentStatus, ContentStatus, ProfileStatus } from '../../types/database';

const LABELS: Record<ContentStatus | CommentStatus | ProfileStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  archived: 'Archivada',
  visible: 'Visible',
  hidden: 'Oculto',
  deleted: 'Eliminado',
  pending: 'Pendiente',
  active: 'Activa',
  suspended: 'Suspendida',
};

const TONE: Record<string, string> = {
  published: 'ok', visible: 'ok', active: 'ok',
  draft: 'warn', pending: 'warn', hidden: 'warn',
  archived: 'muted', deleted: 'muted', suspended: 'danger',
};

export function StatusBadge({ status }: { status: keyof typeof LABELS }) {
  return <span className={`badge badge--${TONE[status] ?? 'muted'}`}>{LABELS[status]}</span>;
}

export const CONTENT_STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicada' },
  { value: 'archived', label: 'Archivada' },
];
