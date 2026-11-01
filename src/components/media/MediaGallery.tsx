import { ExternalLink, FileText, Film, Image as ImageIcon } from 'lucide-react';
import { SignedImage } from './SignedImage';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { classifyMedia, embedUrl, safeExternalUrl } from '../../utils/media';
import type { PostMedia } from '../../types/database';

function SignedVideo({ media }: { media: PostMedia }) {
  const { url, loading, failed, refresh } = useSignedUrl(media.storage_path);
  if (failed) return <p className="muted">No se pudo cargar el video.</p>;
  if (loading || !url) return <div className="img-placeholder img-placeholder--loading media__video" aria-hidden="true" />;
  return (
    <video className="media__video" src={url} controls preload="metadata" onError={refresh} aria-label={media.title ?? 'Video de la publicación'}>
      Tu navegador no admite la reproducción de video.
    </video>
  );
}

function DocumentLink({ media }: { media: PostMedia }) {
  const { url, loading, failed } = useSignedUrl(media.storage_path);
  const label = media.title || 'Documento';
  return (
    <div className="resource">
      <span className="resource__icon" aria-hidden="true"><FileText size={22} /></span>
      <span className="resource__text">
        <strong>{label}</strong>
        <small>{failed ? 'No disponible' : loading ? 'Preparando…' : 'Documento'}</small>
      </span>
      {url && (
        <a className="btn btn--outline btn--sm" href={url} target="_blank" rel="noopener noreferrer" download>
          Descargar
        </a>
      )}
    </div>
  );
}

function ExternalResource({ media }: { media: PostMedia }) {
  const parsed = safeExternalUrl(media.external_url);
  if (!parsed) return null; // enlace inválido o con protocolo inseguro: no se muestra
  const embed = embedUrl(parsed);
  if (embed) {
    return (
      <div className="media__embed">
        <iframe
          src={embed}
          title={media.title ?? 'Video externo'}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <div className="resource">
      <span className="resource__icon" aria-hidden="true"><ExternalLink size={22} /></span>
      <span className="resource__text">
        <strong>{media.title || parsed.hostname}</strong>
        <small>{parsed.hostname}</small>
      </span>
      <a className="btn btn--outline btn--sm" href={parsed.toString()} target="_blank" rel="noopener noreferrer">
        Abrir enlace
      </a>
    </div>
  );
}

export function MediaGallery({ media }: { media: PostMedia[] }) {
  const sorted = [...media].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return null;

  const images = sorted.filter((m) => classifyMedia(m) === 'image' && m.storage_path);
  const videos = sorted.filter((m) => classifyMedia(m) === 'video');
  const others = sorted.filter((m) => !images.includes(m) && !videos.includes(m));

  return (
    <div className="media">
      {images.length > 0 && (
        <div className={`media__images media__images--${Math.min(images.length, 3)}`}>
          {images.map((m) => (
            <figure key={m.id} className="media__figure">
              <SignedImage path={m.storage_path} alt={m.alt_text ?? ''} decorative={!m.alt_text} />
              {m.title && <figcaption>{m.title}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {videos.map((m) =>
        m.storage_path ? (
          <SignedVideo key={m.id} media={m} />
        ) : (
          <ExternalResource key={m.id} media={m} />
        ),
      )}
      {others.length > 0 && (
        <>
          <h2 className="section-title section-title--sm">Recursos</h2>
          <div className="resources">
            {others.map((m) => (m.storage_path ? <DocumentLink key={m.id} media={m} /> : <ExternalResource key={m.id} media={m} />))}
          </div>
        </>
      )}
    </div>
  );
}

export function MediaKindIcon({ kind }: { kind: ReturnType<typeof classifyMedia> }) {
  if (kind === 'image') return <ImageIcon size={16} aria-hidden="true" />;
  if (kind === 'video') return <Film size={16} aria-hidden="true" />;
  if (kind === 'link') return <ExternalLink size={16} aria-hidden="true" />;
  return <FileText size={16} aria-hidden="true" />;
}
