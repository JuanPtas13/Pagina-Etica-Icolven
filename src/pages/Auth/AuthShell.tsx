import type { ReactNode } from 'react';
import { Brand } from '../../components/ui/Brand';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__card">
          <Brand inverse={false} />
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
      <aside className="auth__aside" aria-hidden="true">
        <blockquote>
          La educación es el medio más poderoso para cambiar el mundo.
          <cite>— Enfoque Adventista</cite>
        </blockquote>
      </aside>
    </div>
  );
}
