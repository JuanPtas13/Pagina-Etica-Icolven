import { Link } from 'react-router-dom';

interface BrandProps {
  to?: string;
  inverse?: boolean;
}

export function Brand({ to = '/', inverse = true }: BrandProps) {
  return (
    <Link to={to} className={`brand ${inverse ? 'brand--inverse' : ''}`} aria-label="Divergente · Piensa diferente, actúa consciente">
      <span className="brand__logo">
        <img src="/logo-divergente.jpg" alt="" />
      </span>
      <span className="brand__text">
        <span className="brand__name">DIVERGENTE</span>
        <span className="brand__tag">Piensa diferente, actúa consciente</span>
      </span>
    </Link>
  );
}
