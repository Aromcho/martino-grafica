'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { mediaUrl, srcSet } from '@/lib/media';
import type { Media } from '@/lib/types';

interface ImgProps {
  media: Media | null | undefined;
  alt?: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
  /** relación de aspecto CSS ("4/5"); si no se pasa, el contenedor define el tamaño */
  ratio?: string;
  style?: CSSProperties;
  position?: string;
}

/**
 * Imagen optimizada: srcset WebP (480/960/1600), placeholder borroso (LQIP) y
 * color dominante mientras carga, con fundido suave al aparecer.
 */
export function Img({ media, alt, sizes = '100vw', className, imgClassName, priority, fit = 'cover', ratio, style, position }: ImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, [media?.id]);

  if (!media) {
    return <span className={cn('block bg-graphite', className)} style={{ aspectRatio: ratio, ...style }} aria-hidden="true" />;
  }

  return (
    <span
      className={cn('relative block overflow-hidden', className)}
      style={{ aspectRatio: ratio, backgroundColor: media.dominantColor ?? '#141516', ...style }}
    >
      {media.blurDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.blurDataUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 size-full scale-110 blur-xl transition-opacity duration-700',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            loaded ? 'opacity-0' : 'opacity-100',
          )}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={mediaUrl(media.variants?.md ?? media.path)}
        srcSet={srcSet(media)}
        sizes={sizes}
        alt={alt ?? media.alt ?? ''}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={position ? { objectPosition: position } : undefined}
        className={cn(
          'relative size-full transition-[opacity,transform] duration-700 ease-out-expo',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </span>
  );
}
