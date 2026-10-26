import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, isNull, lte, or, SQL } from 'drizzle-orm';
import { mediaColumns } from '../common/media';
import { reorderRows } from '../common/utils/images';
import { uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { BannerPlacement, banners, highlightItems, highlights } from '../db/schema';
import { BannerDto, HighlightDto, UpdateBannerDto, UpdateHighlightDto } from './dto/content.dto';

const highlightWith = {
  cover: { columns: mediaColumns },
  category: { columns: { id: true, slug: true, name: true } },
  items: {
    orderBy: asc(highlightItems.sortOrder),
    with: {
      media: { columns: mediaColumns },
      work: { columns: { id: true, slug: true, title: true } },
      product: { columns: { id: true, slug: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ContentService {
  constructor(@InjectDb() private readonly db: Database) {}

  // ---------------------------------------------------------------- historias destacadas
  highlights(includeInactive = false) {
    return this.db.query.highlights.findMany({
      where: includeInactive ? undefined : eq(highlights.active, true),
      orderBy: [asc(highlights.sortOrder)],
      with: highlightWith,
    });
  }

  async highlight(id: string) {
    const row = await this.db.query.highlights.findFirst({ where: eq(highlights.id, id), with: highlightWith });
    if (!row) throw new NotFoundException('Historia no encontrada');
    return row;
  }

  private async setItems(highlightId: string, items: HighlightDto['items']) {
    if (!items) return;
    await this.db.transaction(async (tx) => {
      await tx.delete(highlightItems).where(eq(highlightItems.highlightId, highlightId));
      if (items.length)
        await tx.insert(highlightItems).values(items.map((it, i) => ({ ...it, highlightId, sortOrder: i, durationMs: it.durationMs ?? 5000 })));
    });
  }

  async createHighlight(dto: HighlightDto) {
    const { items, ...data } = dto;
    const slug = await uniqueSlug(dto.slug || dto.title, async (s) => !!(await this.db.query.highlights.findFirst({ where: eq(highlights.slug, s) })));
    const [row] = await this.db
      .insert(highlights)
      .values({ ...data, slug, coverId: data.coverId ?? items?.[0]?.mediaId ?? null })
      .returning();
    await this.setItems(row.id, items);
    return this.highlight(row.id);
  }

  async updateHighlight(id: string, dto: UpdateHighlightDto) {
    const { items, ...data } = dto;
    if (Object.keys(data).length) {
      const [row] = await this.db.update(highlights).set(data).where(eq(highlights.id, id)).returning({ id: highlights.id });
      if (!row) throw new NotFoundException('Historia no encontrada');
    }
    await this.setItems(id, items);
    return this.highlight(id);
  }

  async removeHighlight(id: string) {
    const [row] = await this.db.delete(highlights).where(eq(highlights.id, id)).returning();
    if (!row) throw new NotFoundException('Historia no encontrada');
    return row;
  }

  reorderHighlights(ids: string[]) {
    return reorderRows(this.db, highlights, ids);
  }

  // ---------------------------------------------------------------- banners
  banners(placement?: BannerPlacement) {
    const now = new Date();
    const conds: SQL[] = [
      eq(banners.active, true),
      or(isNull(banners.startsAt), lte(banners.startsAt, now))!,
      or(isNull(banners.endsAt), gte(banners.endsAt, now))!,
    ];
    if (placement) conds.push(eq(banners.placement, placement));
    return this.db.query.banners.findMany({ where: and(...conds), orderBy: [asc(banners.sortOrder)], with: { media: { columns: mediaColumns } } });
  }

  adminBanners() {
    return this.db.query.banners.findMany({ orderBy: [asc(banners.placement), asc(banners.sortOrder)], with: { media: { columns: mediaColumns } } });
  }

  private dates<T extends { startsAt?: string | null; endsAt?: string | null }>(dto: T) {
    const { startsAt, endsAt, ...rest } = dto;
    return {
      ...rest,
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
    };
  }

  async createBanner(dto: BannerDto) {
    const [row] = await this.db.insert(banners).values(this.dates(dto) as typeof banners.$inferInsert).returning();
    return row;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const [row] = await this.db.update(banners).set(this.dates(dto)).where(eq(banners.id, id)).returning();
    if (!row) throw new NotFoundException('Banner no encontrado');
    return row;
  }

  async removeBanner(id: string) {
    const [row] = await this.db.delete(banners).where(eq(banners.id, id)).returning();
    if (!row) throw new NotFoundException('Banner no encontrado');
    return row;
  }

  reorderBanners(ids: string[]) {
    return reorderRows(this.db, banners, ids);
  }
}
