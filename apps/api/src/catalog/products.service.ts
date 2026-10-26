import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ne, or, SQL, sql } from 'drizzle-orm';
import { mediaColumns } from '../common/media';
import { reorderRows, replaceImages } from '../common/utils/images';
import { arrayFuzzyContains, fuzzyContains } from '../common/utils/search';
import { slugify, uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { categories, productImages, products, works } from '../db/schema';
import { ProductDto } from './dto/catalog.dto';

const imagesWith = {
  images: { orderBy: asc(productImages.sortOrder), with: { media: { columns: mediaColumns } } },
  category: { columns: { id: true, slug: true, name: true, shortName: true } },
} as const;

type Row = Awaited<ReturnType<ProductsService['rawList']>>[number];

function shape(row: Row) {
  const { images, ...rest } = row;
  const imgs = images.map((i) => i.media).filter(Boolean);
  return { ...rest, cover: imgs[0] ?? null, images: imgs };
}

@Injectable()
export class ProductsService {
  constructor(@InjectDb() private readonly db: Database) {}

  rawList(where?: SQL, limit?: number) {
    return this.db.query.products.findMany({
      where,
      orderBy: [asc(products.sortOrder), asc(products.name)],
      with: imagesWith,
      limit,
    });
  }

  async list(q: { category?: string; q?: string; featured?: boolean; includeInactive?: boolean; limit?: number }) {
    const conds: SQL[] = [];
    if (!q.includeInactive) conds.push(eq(products.active, true));
    if (q.featured) conds.push(eq(products.featured, true));
    if (q.category) {
      const cat = await this.db.query.categories.findFirst({ where: eq(categories.slug, q.category) });
      if (!cat) return [];
      conds.push(eq(products.categoryId, cat.id));
    }
    if (q.q) {
      conds.push(
        or(
          fuzzyContains(products.name, q.q),
          fuzzyContains(products.summary, q.q),
          fuzzyContains(products.description, q.q),
          arrayFuzzyContains([products.materials, products.finishes, products.features], q.q),
        )!,
      );
    }
    const rows = await this.rawList(conds.length ? and(...conds) : undefined, q.limit);
    return rows.map(shape);
  }

  async bySlug(slug: string, countView = true) {
    const row = await this.db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.active, true)),
      with: imagesWith,
    });
    if (!row) throw new NotFoundException('Servicio no encontrado');
    if (countView) void this.db.update(products).set({ views: sql`${products.views} + 1` }).where(eq(products.id, row.id)).then(() => undefined);
    const [relatedWorks, siblings] = await Promise.all([
      this.db.query.works.findMany({
        where: and(eq(works.active, true), or(eq(works.productId, row.id), eq(works.categoryId, row.categoryId))),
        orderBy: [sql`(${works.productId} = ${row.id}) desc nulls last`, desc(works.featured), desc(works.doneAt)],
        limit: 8,
        columns: { id: true, slug: true, title: true, client: true, location: true, doneAt: true },
        with: { cover: { columns: mediaColumns } },
      }),
      this.rawList(and(eq(products.active, true), eq(products.categoryId, row.categoryId), ne(products.id, row.id)), 4),
    ]);
    return { ...shape(row), relatedWorks, siblings: siblings.map(shape) };
  }

  async byId(id: string) {
    const row = await this.db.query.products.findFirst({ where: eq(products.id, id), with: imagesWith });
    if (!row) throw new NotFoundException('Servicio no encontrado');
    return shape(row);
  }

  private exists = async (s: string) => !!(await this.db.query.products.findFirst({ where: eq(products.slug, s) }));

  async create(dto: ProductDto) {
    const { imageIds, ...data } = dto;
    const slug = await uniqueSlug(dto.slug || dto.name, this.exists);
    const [row] = await this.db.insert(products).values({ ...data, slug }).returning();
    if (imageIds) await replaceImages(this.db, productImages, 'productId', row.id, imageIds);
    return this.byId(row.id);
  }

  async update(id: string, dto: Partial<ProductDto>) {
    const { imageIds, ...data } = dto;
    if (data.slug) {
      const s = slugify(data.slug);
      const taken = await this.db.query.products.findFirst({ where: and(eq(products.slug, s), ne(products.id, id)) });
      data.slug = taken ? await uniqueSlug(s, this.exists) : s;
    }
    if (Object.keys(data).length) {
      const [row] = await this.db.update(products).set(data).where(eq(products.id, id)).returning({ id: products.id });
      if (!row) throw new NotFoundException('Servicio no encontrado');
    }
    if (imageIds) await replaceImages(this.db, productImages, 'productId', id, imageIds);
    return this.byId(id);
  }

  async remove(id: string) {
    const [row] = await this.db.delete(products).where(eq(products.id, id)).returning();
    if (!row) throw new NotFoundException('Servicio no encontrado');
    return row;
  }

  reorder(ids: string[]) {
    return reorderRows(this.db, products, ids);
  }
}
