import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, posix } from 'path';
import sharp from 'sharp';

// Sin caché de libvips y con pocos hilos: el VPS es compartido y PM2 reinicia la API a los 400 MB
sharp.cache(false);
sharp.concurrency(2);

export const IMAGE_SIZES = { sm: 480, md: 960, lg: 1600 } as const;
export type VariantKey = keyof typeof IMAGE_SIZES;

export interface ProcessedImage {
  path: string;
  variants: Record<VariantKey, string>;
  width: number;
  height: number;
  blurDataUrl: string;
  dominantColor: string;
  sizeBytes: number;
  mime: string;
}

export interface ProcessOptions {
  /** Recorte en píxeles del original { left, top, width, height } */
  crop?: { left: number; top: number; width: number; height: number };
  folder?: string;
  quality?: number;
}

/**
 * Pipeline de imágenes:
 *  - corrige orientación EXIF
 *  - genera 3 tamaños WebP (sm/md/lg) sin agrandar
 *  - genera un placeholder borroso (LQIP) y el color dominante
 */
export async function processImage(input: Buffer | string, uploadsDir: string, opts: ProcessOptions = {}): Promise<ProcessedImage> {
  const folder = opts.folder ?? new Date().toISOString().slice(0, 7).replace('-', '/');
  const id = randomUUID().slice(0, 12);
  const dir = join(uploadsDir, ...folder.split('/'));
  await fs.mkdir(dir, { recursive: true });

  let base = sharp(input, { failOn: 'none' }).rotate();
  if (opts.crop) base = base.extract(opts.crop);
  const normalized = await base.toBuffer({ resolveWithObject: true });
  const { width = 0, height = 0 } = normalized.info;

  const variants = {} as Record<VariantKey, string>;
  let sizeBytes = 0;
  for (const [key, target] of Object.entries(IMAGE_SIZES) as [VariantKey, number][]) {
    const file = `${id}-${key}.webp`;
    const info = await sharp(normalized.data)
      .resize({ width: Math.min(target, width), withoutEnlargement: true })
      .webp({ quality: opts.quality ?? 82, effort: 5, smartSubsample: true })
      .toFile(join(dir, file));
    if (key === 'lg') sizeBytes = info.size;
    variants[key] = posix.join(folder, file);
  }

  const blur = await sharp(normalized.data).resize(16).webp({ quality: 40 }).toBuffer();
  const { dominant } = await sharp(normalized.data).stats();
  const hex = (n: number) => n.toString(16).padStart(2, '0');

  return {
    path: variants.lg,
    variants,
    width: Math.min(width, IMAGE_SIZES.lg),
    height: Math.round(height * (Math.min(width, IMAGE_SIZES.lg) / Math.max(width, 1))),
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    sizeBytes,
    mime: 'image/webp',
  };
}

/** Guarda un video tal cual (para fondos/hero) */
export async function storeVideo(buffer: Buffer, uploadsDir: string, ext = 'mp4', folder = 'videos') {
  const dir = join(uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });
  const file = `${randomUUID().slice(0, 12)}.${ext}`;
  await fs.writeFile(join(dir, file), buffer);
  return { path: posix.join(folder, file), sizeBytes: buffer.length, mime: `video/${ext}` };
}
