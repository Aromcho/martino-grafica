import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import { mediaColumns } from '../common/media';
import { reorderRows } from '../common/utils/images';
import { slugify, uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { categories, products, works } from '../db/schema';
import { CategoryDto } from './dto/catalog.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectDb() private readonly db: Database) {}

  private async counts() {
    const [p, w] = await Promise.all([
      this.db.select({ id: products.categoryId, n: count() }).from(products).where(eq(products.active, true)).groupBy(products.categoryId),
      this.db.select({ id: works.categoryId, n: count() }).from(works).where(eq(works.active, true)).groupBy(works.categoryId),
    ]);
    return { p: new Map(p.map((r) => [r.id, r.n])), w: new Map(w.map((r) => [r.id, r.n])) };
  }

  async list(includeInactive = false) {
    const [rows, c] = await Promise.all([
      this.db.query.categories.findMany({
        where: includeInactive ? undefined : eq(categories.active, true),
        orderBy: [asc(categories.sortOrder), asc(categories.name)],
        with: { cover: { columns: mediaColumns } },
      }),
      this.counts(),
    ]);
    return rows.map((r) => ({ ...r, productCount: c.p.get(r.id) ?? 0, workCount: c.w.get(r.id) ?? 0 }));
  }

  async bySlug(slug: string) {
    const row = await this.db.query.categories.findFirst({
      where: and(eq(categories.slug, slug), eq(categories.active, true)),
      with: { cover: { columns: mediaColumns } },
    });
    if (!row) throw new NotFoundException('Rubro no encontrado');
    return row;
  }

  async create(dto: CategoryDto) {
    const slug = await uniqueSlug(dto.slug || dto.name, async (s) => !!(await this.db.query.categories.findFirst({ where: eq(categories.slug, s) })));
    const [row] = await this.db.insert(categories).values({ ...dto, slug }).returning();
    return row;
  }

  async update(id: string, dto: Partial<CategoryDto>) {
    const data: Partial<CategoryDto> = { ...dto };
    if (dto.slug) {
      const s = slugify(dto.slug);
      const taken = await this.db.query.categories.findFirst({ where: and(eq(categories.slug, s), ne(categories.id, id)) });
      data.slug = taken ? await uniqueSlug(s, async (x) => !!(await this.db.query.categories.findFirst({ where: eq(categories.slug, x) }))) : s;
    }
    const [row] = await this.db.update(categories).set(data).where(eq(categories.id, id)).returning();
    if (!row) throw new NotFoundException('Rubro no encontrado');
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db.delete(categories).where(eq(categories.id, id)).returning();
    if (!row) throw new NotFoundException('Rubro no encontrado');
    return row;
  }

  reorder(ids: string[]) {
    return reorderRows(this.db, categories, ids);
  }
}
