import type { ReactNode } from 'react';
import { AlertTriangle, BookOpen, Loader2 } from 'lucide-react';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <Loader2 className="spin" aria-hidden="true" size={26} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle aria-hidden="true" size={28} />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state--empty">
      <span className="state__icon" aria-hidden="true">
        <BookOpen size={30} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success' | 'warning'; children: ReactNode }) {
  return (
    <div className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
