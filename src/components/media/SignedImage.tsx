import { ImageOff } from 'lucide-react';
import { useSignedUrl } from '../../hooks/useSignedUrl';

interface Props {
  path: string | null | undefined;
  alt: string;
  className?: string;
  /** Imagen decorativa (p. ej. miniatura de una tarjeta que ya tiene título). */
  decorative?: boolean;
}

/** Muestra una imagen del bucket privado mediante URL firmada, con marcador de posición si falta o falla. */
export function SignedImage({ path, alt, className = '', decorative = false }: Props) {
  const { url, loading, failed, refresh } = useSignedUrl(path);

  if (!path) return <div className={`img-placeholder ${className}`} aria-hidden="true" />;
  if (failed) {
    return (
      <div className={`img-placeholder img-placeholder--error ${className}`} role="img" aria-label="No se pudo cargar la imagen">
        <ImageOff size={22} aria-hidden="true" />
      </div>
    );
  }
  if (loading || !url) return <div className={`img-placeholder img-placeholder--loading ${className}`} aria-hidden="true" />;
  return (
    <img
      src={url}
      alt={decorative ? '' : alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={refresh} // la URL pudo expirar: se vuelve a firmar
    />
  );
}
