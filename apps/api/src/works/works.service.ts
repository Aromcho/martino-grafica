import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, lt, ne, or, SQL, sql } from 'drizzle-orm';
import { mediaColumns } from '../common/media';
import { replaceImages, reorderRows } from '../common/utils/images';
import { paginate } from '../common/utils/pagination';
import { arrayFuzzyContains, fuzzyContains, normCol, normalizeTerm } from '../common/utils/search';
import { slugify, uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { categories, workImages, works } from '../db/schema';
import { UpdateWorkDto, WorkDto } from './dto/work.dto';

const cardWith = {
  cover: { columns: mediaColumns },
  category: { columns: { id: true, slug: true, name: true, shortName: true } },
  images: { orderBy: asc(workImages.sortOrder), limit: 4, with: { media: { columns: mediaColumns } } },
} as const;

export interface WorkQuery {
  category?: string;
  location?: string;
  q?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  sort?: 'recent' | 'manual';
}

@Injectable()
export class WorksService {
  constructor(@InjectDb() private readonly db: Database) {}

  private async where(q: WorkQuery) {
    const conds: SQL[] = [];
    if (!q.includeInactive) conds.push(eq(works.active, true));
    if (q.featured) conds.push(eq(works.featured, true));
    if (q.category) {
      const cat = await this.db.query.categories.findFirst({ where: eq(categories.slug, q.category) });
      conds.push(eq(works.categoryId, cat?.id ?? '00000000-0000-0000-0000-000000000000'));
    }
    if (q.location) conds.push(sql`${normCol(works.location)} = ${normalizeTerm(q.location)}`);
    if (q.q) {
      conds.push(
        or(
          fuzzyContains(works.title, q.q),
          fuzzyContains(works.client, q.q),
          fuzzyContains(works.summary, q.q),
          fuzzyContains(works.description, q.q),
          fuzzyContains(works.location, q.q),
          arrayFuzzyContains([works.materials], q.q),
        )!,
      );
    }
    return conds.length ? and(...conds) : undefined;
  }

  private shapeCard<T extends { images: { media: unknown }[]; cover: unknown }>(row: T) {
    const { images, ...rest } = row;
    const imgs = images.map((i) => i.media).filter(Boolean);
    return { ...rest, cover: rest.cover ?? imgs[0] ?? null, preview: imgs.slice(0, 4), imageCount: imgs.length };
  }

  async list(q: WorkQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(120, Math.max(1, q.pageSize ?? 24));
    const where = await this.where(q);
    const order =
      q.sort === 'manual' ? [asc(works.sortOrder), desc(works.doneAt)] : [desc(works.featured), desc(works.doneAt), asc(works.sortOrder)];
    const [rows, [{ total }]] = await Promise.all([
      this.db.query.works.findMany({ where, orderBy: order, limit: pageSize, offset: (page - 1) * pageSize, with: cardWith }),
      this.db.select({ total: count() }).from(works).where(where),
    ]);
    return paginate(rows.map((r) => this.shapeCard(r)), total, page, pageSize);
  }

  async facets() {
    const [cats, locs, years] = await Promise.all([
      this.db
        .select({ slug: categories.slug, name: categories.name, shortName: categories.shortName, n: count() })
        .from(works)
        .innerJoin(categories, eq(categories.id, works.categoryId))
        .where(eq(works.active, true))
        .groupBy(categories.slug, categories.name, categories.shortName, categories.sortOrder)
        .orderBy(asc(categories.sortOrder)),
      this.db
        .select({ location: works.location, n: count() })
        .from(works)
        .where(and(eq(works.active, true), sql`${works.location} is not null`))
        .groupBy(works.location)
        .orderBy(desc(count())),
      this.db.execute<{ year: number; n: number }>(
        sql`SELECT extract(year from done_at)::int AS year, count(*)::int AS n FROM works WHERE active AND done_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC`,
      ),
    ]);
    return {
      categories: cats,
      locations: locs.filter((l) => l.location).map((l) => ({ location: l.location as string, n: l.n })),
      years: years.rows,
    };
  }

  async bySlug(slug: string, countView = true) {
    const row = await this.db.query.works.findFirst({
      where: and(eq(works.slug, slug), eq(works.active, true)),
      with: {
        cover: { columns: mediaColumns },
        category: { columns: { id: true, slug: true, name: true, shortName: true } },
        product: { columns: { id: true, slug: true, name: true, summary: true, priceFrom: true, quoteMode: true } },
        images: { orderBy: [asc(workImages.sortOrder)], with: { media: { columns: mediaColumns } } },
      },
    });
    if (!row) throw new NotFoundException('Trabajo no encontrado');
    if (countView) void this.db.update(works).set({ views: sql`${works.views} + 1` }).where(eq(works.id, row.id)).then(() => undefined);
    const doneAt = row.doneAt ?? '1900-01-01';
    const [prev, next, related] = await Promise.all([
      this.db.query.works.findFirst({
        where: and(eq(works.active, true), lt(works.doneAt, doneAt)),
        orderBy: [desc(works.doneAt)],
        columns: { slug: true, title: true },
      }),
      this.db.query.works.findFirst({
        where: and(eq(works.active, true), gt(works.doneAt, doneAt)),
        orderBy: [asc(works.doneAt)],
        columns: { slug: true, title: true },
      }),
      this.db.query.works.findMany({
        where: and(eq(works.active, true), eq(works.categoryId, row.categoryId), ne(works.id, row.id)),
        orderBy: [desc(works.featured), desc(works.doneAt)],
        limit: 6,
        with: cardWith,
      }),
    ]);
    const { images, ...rest } = row;
    const imgs = images.map((i) => i.media).filter(Boolean);
    return { ...rest, cover: rest.cover ?? imgs[0] ?? null, images: imgs, prev: prev ?? null, next: next ?? null, related: related.map((r) => this.shapeCard(r)) };
  }

  async byId(id: string) {
    const row = await this.db.query.works.findFirst({
      where: eq(works.id, id),
      with: {
        cover: { columns: mediaColumns },
        category: { columns: { id: true, slug: true, name: true } },
        images: { orderBy: [asc(workImages.sortOrder)], with: { media: { columns: mediaColumns } } },
      },
    });
    if (!row) throw new NotFoundException('Trabajo no encontrado');
    const { images, ...rest } = row;
    return { ...rest, images: images.map((i) => i.media).filter(Boolean) };
  }

  private exists = async (s: string) => !!(await this.db.query.works.findFirst({ where: eq(works.slug, s) }));

  async create(dto: WorkDto) {
    const { imageIds, ...data } = dto;
    const slug = await uniqueSlug(dto.slug || `${dto.title}`, this.exists);
    const coverId = data.coverId ?? imageIds?.[0] ?? null;
    const [row] = await this.db.insert(works).values({ ...data, coverId, slug }).returning();
    if (imageIds) await replaceImages(this.db, workImages, 'workId', row.id, imageIds);
    return this.byId(row.id);
  }

  async update(id: string, dto: UpdateWorkDto) {
    const { imageIds, ...data } = dto;
    if (data.slug) {
      const s = slugify(data.slug);
      const taken = await this.db.query.works.findFirst({ where: and(eq(works.slug, s), ne(works.id, id)) });
      data.slug = taken ? await uniqueSlug(s, this.exists) : s;
    }
    if (imageIds && data.coverId === undefined) {
      const current = await this.db.query.works.findFirst({ where: eq(works.id, id), columns: { coverId: true } });
      if (!current?.coverId || !imageIds.includes(current.coverId)) data.coverId = imageIds[0] ?? null;
    }
    if (Object.keys(data).length) {
      const [row] = await this.db.update(works).set(data).where(eq(works.id, id)).returning({ id: works.id });
      if (!row) throw new NotFoundException('Trabajo no encontrado');
    }
    if (imageIds) await replaceImages(this.db, workImages, 'workId', id, imageIds);
    return this.byId(id);
  }

  async remove(id: string) {
    const [row] = await this.db.delete(works).where(eq(works.id, id)).returning();
    if (!row) throw new NotFoundException('Trabajo no encontrado');
    return row;
  }

  reorder(ids: string[]) {
    return reorderRows(this.db, works, ids);
  }
}
