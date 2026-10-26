import type { Media } from './types';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** URL pública de un archivo subido (las sirve la API bajo /uploads, reescrito por Next) */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('/')) return path;
  return `/uploads/${path}`;
}

export function absoluteMediaUrl(path: string | null | undefined): string {
  const url = mediaUrl(path);
  return url.startsWith('/') ? `${SITE_URL}${url}` : url;
}

/** srcset con las variantes WebP generadas por la API (480 / 960 / 1600 px) */
export function srcSet(m: Media | null | undefined): string | undefined {
  const v = m?.variants;
  if (!v) return undefined;
  const w = m?.width ?? 1600;
  const sizes: [string, number][] = [
    [v.sm, Math.min(480, w)],
    [v.md, Math.min(960, w)],
    [v.lg, Math.min(1600, w)],
  ];
  const seen = new Set<number>();
  return sizes
    .filter(([, width]) => (seen.has(width) ? false : (seen.add(width), true)))
    .map(([p, width]) => `${mediaUrl(p)} ${width}w`)
    .join(', ');
}

export function bestSrc(m: Media | null | undefined, size: 'sm' | 'md' | 'lg' = 'md'): string {
  if (!m) return '';
  return mediaUrl(m.variants?.[size] ?? m.path);
}
