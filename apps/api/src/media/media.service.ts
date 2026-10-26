import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, count, desc, eq, inArray, or, SQL, sql } from 'drizzle-orm';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { fuzzyContains } from '../common/utils/search';
import { Database, InjectDb } from '../db/db.module';
import { media, MediaKind } from '../db/schema';
import { processImage, storeVideo } from './image-pipeline';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif', 'image/tiff'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

@Injectable()
export class MediaService {
  readonly uploadsDir: string;

  constructor(
    @InjectDb() private readonly db: Database,
    config: ConfigService,
  ) {
    this.uploadsDir = resolve(config.get<string>('UPLOADS_DIR') ?? './uploads');
  }

  /** Procesa y guarda un archivo (imágenes → WebP 480/960/1600 + placeholder borroso) */
  async upload(file: Express.Multer.File, alt?: string, source = 'upload') {
    if (!file) throw new BadRequestException('Falta el archivo');
    const [{ min }] = await this.db.select({ min: sql<number>`coalesce(min(${media.sortOrder}), 0)` }).from(media);
    const sortOrder = Number(min) - 1; // lo nuevo aparece primero
    if (IMAGE_TYPES.includes(file.mimetype)) {
      const img = await processImage(file.buffer, this.uploadsDir);
      const [row] = await this.db.insert(media).values({ kind: 'IMAGE', ...img, alt: alt || null, source, sortOrder }).returning();
      return row;
    }
    if (VIDEO_TYPES.includes(file.mimetype)) {
      const ext = file.mimetype === 'video/webm' ? 'webm' : file.mimetype === 'video/quicktime' ? 'mov' : 'mp4';
      const vid = await storeVideo(file.buffer, this.uploadsDir, ext);
      const [row] = await this.db.insert(media).values({ kind: 'VIDEO', ...vid, alt: alt || null, source, sortOrder }).returning();
      return row;
    }
    throw new BadRequestException('Formato no soportado. Subí JPG, PNG, WebP, AVIF, HEIC, MP4 o WebM.');
  }

  async list(params: { page: number; pageSize: number; kind?: MediaKind; q?: string }) {
    const conds: SQL[] = [];
    if (params.kind) conds.push(eq(media.kind, params.kind));
    if (params.q) conds.push(or(fuzzyContains(media.alt, params.q), fuzzyContains(media.source, params.q))!);
    const where = conds.length ? and(...conds) : undefined;
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(media)
        .where(where)
        .orderBy(asc(media.sortOrder), desc(media.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      this.db.select({ total: count() }).from(media).where(where),
    ]);
    return { items, total };
  }

  async update(id: string, data: { alt?: string }) {
    const [row] = await this.db.update(media).set({ alt: data.alt ?? null }).where(eq(media.id, id)).returning();
    if (!row) throw new NotFoundException('Archivo no encontrado');
    return row;
  }

  /** Guarda el orden manual de la biblioteca (ids en el orden deseado) */
  async reorder(ids: string[]) {
    if (!ids.length) return { ok: true };
    const existing = await this.db.select({ id: media.id, sortOrder: media.sortOrder }).from(media).where(inArray(media.id, ids));
    // Mantiene el bloque en su posición: reutiliza los órdenes actuales, ordenados
    const slots = existing.map((e) => e.sortOrder).sort((a, b) => a - b);
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(media).set({ sortOrder: slots[i] ?? i }).where(eq(media.id, ids[i]));
      }
    });
    return { ok: true };
  }

  async remove(id: string) {
    const row = await this.db.query.media.findFirst({ where: eq(media.id, id) });
    if (!row) throw new NotFoundException('Archivo no encontrado');
    await this.db.delete(media).where(eq(media.id, id));
    const files = new Set<string>([row.path, ...Object.values(row.variants ?? {})]);
    await Promise.all([...files].map((p) => fs.unlink(join(this.uploadsDir, p)).catch(() => undefined)));
    return { ...row, label: row.alt ?? row.path };
  }
}
