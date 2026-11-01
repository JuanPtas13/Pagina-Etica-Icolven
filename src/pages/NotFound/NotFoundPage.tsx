import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/States';

export function NotFoundPage() {
  return (
    <div className="container page">
      <EmptyState title="Página no encontrada" action={<Link to="/" className="btn btn--primary">Volver al inicio</Link>}>
        La dirección que buscas no existe o fue movida.
      </EmptyState>
    </div>
  );
}
