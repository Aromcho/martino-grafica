import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { and, desc, eq, or } from 'drizzle-orm';
import { CategoriesService } from '../catalog/categories.service';
import { ProductsService } from '../catalog/products.service';
import { mediaColumns } from '../common/media';
import { arrayFuzzyContains, fuzzyContains, normalizeTerm } from '../common/utils/search';
import { Database, InjectDb } from '../db/db.module';
import { products, works } from '../db/schema';
import { StoreService } from '../store/store.service';

@ApiTags('búsqueda')
@Controller()
export class SearchController {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly store: StoreService,
  ) {}

  /** Búsqueda global (servicios, trabajos y rubros) sin acentos */
  @Get('search')
  async search(@Query('q') q = '') {
    const term = q.trim();
    if (normalizeTerm(term).length < 2) return { q: term, store: [], products: [], works: [], categories: [] };
    const [storeItems, prods, wks, cats] = await Promise.all([
      this.store.search(term, 8),
      this.products.list({ q: term, limit: 8 }),
      this.db.query.works.findMany({
        where: and(
          eq(works.active, true),
          or(
            fuzzyContains(works.title, term),
            fuzzyContains(works.client, term),
            fuzzyContains(works.location, term),
            fuzzyContains(works.description, term),
            arrayFuzzyContains([works.materials], term),
          ),
        ),
        orderBy: [desc(works.featured), desc(works.doneAt)],
        limit: 12,
        columns: { id: true, slug: true, title: true, client: true, location: true, doneAt: true },
        with: { cover: { columns: mediaColumns }, category: { columns: { slug: true, name: true } } },
      }),
      this.categories.list(),
    ]);
    const n = normalizeTerm(term);
    const matchCats = cats.filter((c) =>
      [c.name, c.shortName ?? '', c.tagline ?? '', ...(c.materials ?? [])].some((s) => normalizeTerm(s).includes(n)),
    );
    return {
      q: term,
      store: storeItems,
      products: prods.map((p) => ({ id: p.id, slug: p.slug, name: p.name, summary: p.summary, priceFrom: p.priceFrom, cover: p.cover, category: p.category })),
      works: wks,
      categories: matchCats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, cover: c.cover })),
    };
  }

  /** Slugs y fechas para el sitemap del sitio */
  @Get('sitemap')
  async sitemap() {
    const [p, w, c, s] = await Promise.all([
      this.db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.active, true)),
      this.db.select({ slug: works.slug, updatedAt: works.updatedAt }).from(works).where(eq(works.active, true)),
      this.categories.list(),
      this.store.sitemap(),
    ]);
    return { products: p, works: w, categories: c.map((x) => ({ slug: x.slug, updatedAt: x.updatedAt })), store: s };
  }
}
