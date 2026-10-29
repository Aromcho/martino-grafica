import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNotNull, ne, or, SQL, sql } from 'drizzle-orm';
import { BusinessInfo, BusinessService } from '../business/business.service';
import { mediaColumns } from '../common/media';
import { reorderRows } from '../common/utils/images';
import { waLink, waNumber } from '../common/utils/phone';
import { fuzzyContains } from '../common/utils/search';
import { slugify, uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { orderItems, quoteEvents, quotes, storeCategories, storeProducts } from '../db/schema';
import { QuotesService } from '../quotes/quotes.service';
import { BulkStoreDto, CreateOrderDto, PriceAdjustDto, StoreCategoryDto, StoreProductDto } from './dto/store.dto';

export type StoreSort = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nombre' | 'nuevos';
const SORTS: StoreSort[] = ['relevancia', 'precio-asc', 'precio-desc', 'nombre', 'nuevos'];

const money = (n: number) => `$${n.toLocaleString('es-AR')}`;

const cardColumns = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  subcategory: true,
  price: true,
  unit: true,
  inStock: true,
  featured: true,
} as const;

const cardWith = {
  image: { columns: mediaColumns },
  category: { columns: { id: true, slug: true, name: true } },
} as const;

@Injectable()
export class StoreService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly business: BusinessService,
    private readonly quotesService: QuotesService,
  ) {}

  // ---------------------------------------------------------------- público
  private orderBy(sort: StoreSort) {
    switch (sort) {
      case 'precio-asc':
        return [sql`${storeProducts.price} asc nulls last`, asc(storeProducts.name)];
      case 'precio-desc':
        return [sql`${storeProducts.price} desc nulls last`, asc(storeProducts.name)];
      case 'nombre':
        return [asc(storeProducts.name)];
      case 'nuevos':
        return [desc(storeProducts.createdAt), asc(storeProducts.name)];
      default:
        return [desc(storeProducts.featured), desc(storeProducts.inStock), desc(storeProducts.ordered), asc(storeProducts.sortOrder), asc(storeProducts.name)];
    }
  }

  private searchCond(q: string) {
    // Cada palabra tiene que aparecer (en el nombre, marca, sub-rubro o código): "vinilo negro mate"
    const words = q.split(/\s+/).filter((w) => w.length > 1).slice(0, 6);
    return and(...words.map((w) => or(fuzzyContains(storeProducts.name, w), fuzzyContains(storeProducts.brand, w), fuzzyContains(storeProducts.subcategory, w), fuzzyContains(storeProducts.sku, w))!));
  }

  async categories(includeInactive = false) {
    const rows = await this.db.query.storeCategories.findMany({
      where: includeInactive ? undefined : eq(storeCategories.active, true),
      orderBy: [asc(storeCategories.sortOrder), asc(storeCategories.name)],
      with: { cover: { columns: mediaColumns } },
    });
    const counts = await this.db
      .select({ id: storeProducts.categoryId, n: count() })
      .from(storeProducts)
      .where(eq(storeProducts.active, true))
      .groupBy(storeProducts.categoryId);
    const byId = new Map(counts.map((c) => [c.id, c.n]));
    // Portada: la elegida en el panel o la foto del producto más destacado de la categoría
    const fallback = await Promise.all(
      rows.map((r) =>
        r.cover
          ? null
          : this.db.query.storeProducts.findFirst({
              where: and(eq(storeProducts.categoryId, r.id), eq(storeProducts.active, true), isNotNull(storeProducts.imageId)),
              orderBy: [desc(storeProducts.featured), desc(storeProducts.inStock), desc(storeProducts.ordered), asc(storeProducts.sortOrder)],
              columns: { id: true },
              with: { image: { columns: mediaColumns } },
            }),
      ),
    );
    return rows.map((r, i) => ({ ...r, cover: r.cover ?? fallback[i]?.image ?? null, productCount: byId.get(r.id) ?? 0 }));
  }

  async list(p: { category?: string; sub?: string; q?: string; sort?: string; page?: number; pageSize?: number; featured?: boolean; includeInactive?: boolean; inStock?: boolean }) {
    const conds: SQL[] = [];
    let category: (typeof storeCategories.$inferSelect) | undefined;
    if (!p.includeInactive) conds.push(eq(storeProducts.active, true));
    if (p.category) {
      category = await this.db.query.storeCategories.findFirst({ where: eq(storeCategories.slug, p.category) });
      if (!category || (!category.active && !p.includeInactive)) return { items: [], total: 0, page: 1, pageSize: p.pageSize ?? 24, pages: 1, subcategories: [], category: null };
      conds.push(eq(storeProducts.categoryId, category.id));
    } else if (!p.includeInactive) {
      conds.push(sql`${storeProducts.categoryId} in (select id from store_categories where active)`);
    }
    if (p.featured) conds.push(eq(storeProducts.featured, true));
    if (p.inStock) conds.push(eq(storeProducts.inStock, true));
    if (p.q?.trim()) conds.push(this.searchCond(p.q.trim())!);
    const base = conds.length ? and(...conds) : undefined;
    const where = p.sub ? and(base, eq(storeProducts.subcategory, p.sub)) : base;
    const pageSize = Math.min(96, Math.max(1, p.pageSize ?? 24));
    const page = Math.max(1, p.page ?? 1);
    const sort = SORTS.includes(p.sort as StoreSort) ? (p.sort as StoreSort) : 'relevancia';

    const [items, [{ total }], subs] = await Promise.all([
      this.db.query.storeProducts.findMany({ where, orderBy: this.orderBy(sort), limit: pageSize, offset: (page - 1) * pageSize, columns: cardColumns, with: cardWith }),
      this.db.select({ total: count() }).from(storeProducts).where(where),
      category
        ? this.db
            .select({ name: storeProducts.subcategory, n: count() })
            .from(storeProducts)
            .where(and(base, isNotNull(storeProducts.subcategory)))
            .groupBy(storeProducts.subcategory)
            .orderBy(desc(count()))
        : Promise.resolve([] as { name: string | null; n: number }[]),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      subcategories: subs.filter((s) => s.name).map((s) => ({ name: s.name!, n: s.n })),
      category: category ? { id: category.id, slug: category.slug, name: category.name, tagline: category.tagline, description: category.description } : null,
    };
  }

  async bySlug(slug: string, countView = true) {
    const row = await this.db.query.storeProducts.findFirst({
      where: and(eq(storeProducts.slug, slug), eq(storeProducts.active, true)),
      columns: { referencePrice: false, source: false, sourceId: false, syncedAt: false },
      with: cardWith,
    });
    if (!row) throw new NotFoundException('Producto no encontrado');
    if (countView) void this.db.update(storeProducts).set({ views: sql`${storeProducts.views} + 1` }).where(eq(storeProducts.id, row.id)).then(() => undefined);
    const sameSub = row.subcategory ? eq(storeProducts.subcategory, row.subcategory) : undefined;
    const related = await this.db.query.storeProducts.findMany({
      where: and(eq(storeProducts.active, true), eq(storeProducts.categoryId, row.categoryId), ne(storeProducts.id, row.id)),
      orderBy: [...(sameSub ? [sql`(${sameSub}) desc`] : []), desc(storeProducts.inStock), desc(storeProducts.featured), desc(storeProducts.ordered), asc(storeProducts.name)],
      limit: 8,
      columns: cardColumns,
      with: cardWith,
    });
    return { ...row, related };
  }

  async search(q: string, limit = 8) {
    if (q.trim().length < 2) return [];
    return this.db.query.storeProducts.findMany({
      where: and(eq(storeProducts.active, true), this.searchCond(q.trim())),
      orderBy: this.orderBy('relevancia'),
      limit,
      columns: cardColumns,
      with: cardWith,
    });
  }

  sitemap() {
    return this.db.select({ slug: storeProducts.slug, updatedAt: storeProducts.updatedAt }).from(storeProducts).where(eq(storeProducts.active, true));
  }

  // ---------------------------------------------------------------- pedidos de compra
  async createOrder(dto: CreateOrderDto) {
    if (dto.website) throw new BadRequestException('No pudimos enviar el pedido');
    const qty = new Map<string, number>();
    for (const l of dto.items) qty.set(l.productId, Math.min(999, (qty.get(l.productId) ?? 0) + l.quantity));
    const rows = await this.db.query.storeProducts.findMany({
      where: and(inArray(storeProducts.id, [...qty.keys()]), eq(storeProducts.active, true)),
      columns: { id: true, name: true, sku: true, price: true, unit: true },
    });
    if (!rows.length) throw new BadRequestException('Los productos del carrito ya no están disponibles. Actualizá la página.');
    const byId = new Map(rows.map((r) => [r.id, r]));
    const lines = [...qty.entries()]
      .filter(([id]) => byId.has(id))
      .map(([id, quantity], i) => {
        const p = byId.get(id)!;
        return { productId: id, name: p.name, sku: p.sku, unitPrice: p.price, quantity, subtotal: p.price != null ? p.price * quantity : null, sortOrder: i, unit: p.unit };
      });
    const total = lines.reduce((n, l) => n + (l.subtotal ?? 0), 0);
    const unpriced = lines.filter((l) => l.unitPrice == null).length;
    const units = lines.reduce((n, l) => n + l.quantity, 0);
    const code = await this.quotesService.newCode();

    const [row] = await this.db
      .insert(quotes)
      .values({
        code,
        kind: 'ORDER',
        customerName: dto.customerName,
        phone: dto.phone,
        email: dto.email ?? null,
        city: dto.city ?? null,
        productName: `Compra en la tienda · ${lines.length} ${lines.length === 1 ? 'producto' : 'productos'}`,
        quantity: units,
        delivery: dto.delivery ?? 'PICKUP',
        message: dto.message ?? null,
        estimate: total || null,
        source: 'tienda',
      })
      .returning();
    await this.db.insert(orderItems).values(lines.map(({ unit: _u, ...l }) => ({ ...l, quoteId: row.id })));
    await this.db.insert(quoteEvents).values({ quoteId: row.id, type: 'created', toStatus: 'NEW', note: `Pedido de compra desde la tienda: ${units} ${units === 1 ? 'unidad' : 'unidades'}${total ? `, ${money(total)}` : ''}` });
    for (const l of lines) void this.db.update(storeProducts).set({ ordered: sql`${storeProducts.ordered} + ${l.quantity}` }).where(eq(storeProducts.id, l.productId)).then(() => undefined);

    const info = await this.business.getSetting<BusinessInfo | null>('business', null);
    const text = [
      `Hola Martino Gráfica 👋 Quiero hacer este pedido de la tienda: ${code}`,
      '',
      ...lines.map((l) => `• ${l.quantity} × ${l.name}${l.sku ? ` (${l.sku})` : ''} — ${l.subtotal != null ? money(l.subtotal) : 'precio a consultar'}`),
      '',
      total ? `Total: ${money(total)}${unpriced ? ' + lo que hay que consultar' : ''} (precios de la web, a confirmar)` : 'Total: a consultar',
      `Entrega: ${dto.delivery === 'SHIPPING' ? 'envío (a coordinar)' : 'retiro en el taller'}`,
      ...(dto.message ? ['', dto.message] : []),
      '',
      `${dto.customerName}${dto.city ? ` · ${dto.city}` : ''}`,
    ].join('\n');
    return { code, total, unpriced, whatsappUrl: info?.whatsapp ? waLink(waNumber(info.whatsapp), text) : null, message: text };
  }

  // ---------------------------------------------------------------- panel: productos
  async adminList(p: { q?: string; category?: string; status?: string; page: number; pageSize: number; sort?: string }) {
    const conds: SQL[] = [];
    if (p.category) conds.push(eq(storeProducts.categoryId, p.category));
    if (p.q?.trim()) conds.push(this.searchCond(p.q.trim())!);
    switch (p.status) {
      case 'hidden':
        conds.push(eq(storeProducts.active, false));
        break;
      case 'featured':
        conds.push(eq(storeProducts.featured, true));
        break;
      case 'nostock':
        conds.push(eq(storeProducts.inStock, false));
        break;
      case 'noprice':
        conds.push(sql`${storeProducts.price} is null`);
        break;
      case 'custom':
        conds.push(sql`${storeProducts.price} is distinct from ${storeProducts.referencePrice}`);
        break;
    }
    const where = conds.length ? and(...conds) : undefined;
    const sort = SORTS.includes(p.sort as StoreSort) ? (p.sort as StoreSort) : 'nombre';
    const [items, [{ total }]] = await Promise.all([
      this.db.query.storeProducts.findMany({ where, orderBy: this.orderBy(sort), limit: p.pageSize, offset: (p.page - 1) * p.pageSize, with: cardWith }),
      this.db.select({ total: count() }).from(storeProducts).where(where),
    ]);
    return { items, total, page: p.page, pageSize: p.pageSize, pages: Math.max(1, Math.ceil(total / p.pageSize)) };
  }

  async byId(id: string) {
    const row = await this.db.query.storeProducts.findFirst({ where: eq(storeProducts.id, id), with: cardWith });
    if (!row) throw new NotFoundException('Producto no encontrado');
    return row;
  }

  private slugTaken = async (s: string) => !!(await this.db.query.storeProducts.findFirst({ where: eq(storeProducts.slug, s), columns: { id: true } }));

  async create(dto: StoreProductDto) {
    const slug = await uniqueSlug(dto.slug || dto.name, this.slugTaken);
    const [row] = await this.db.insert(storeProducts).values({ ...dto, slug, source: 'manual' }).returning({ id: storeProducts.id });
    return this.byId(row.id);
  }

  async update(id: string, dto: Partial<StoreProductDto>) {
    const data = { ...dto };
    if (data.slug) {
      const s = slugify(data.slug);
      const taken = await this.db.query.storeProducts.findFirst({ where: and(eq(storeProducts.slug, s), ne(storeProducts.id, id)), columns: { id: true } });
      data.slug = taken ? await uniqueSlug(s, this.slugTaken) : s;
    }
    if (Object.keys(data).length) {
      const [row] = await this.db.update(storeProducts).set(data).where(eq(storeProducts.id, id)).returning({ id: storeProducts.id });
      if (!row) throw new NotFoundException('Producto no encontrado');
    }
    return this.byId(id);
  }

  async remove(id: string) {
    const [row] = await this.db.delete(storeProducts).where(eq(storeProducts.id, id)).returning({ id: storeProducts.id, name: storeProducts.name });
    if (!row) throw new NotFoundException('Producto no encontrado');
    return row;
  }

  async bulk(dto: BulkStoreDto) {
    const { ids, ...patch } = dto;
    const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(set).length) throw new BadRequestException('No hay cambios para aplicar');
    const rows = await this.db.update(storeProducts).set(set).where(inArray(storeProducts.id, ids)).returning({ id: storeProducts.id });
    return { ok: true, label: `${rows.length} productos` };
  }

  /** Precio = precio de lista del proveedor + % (redondeado) */
  async adjustPrices(dto: PriceAdjustDto) {
    const round = dto.roundTo ?? 10;
    const factor = 1 + dto.percent / 100;
    const conds: SQL[] = [isNotNull(storeProducts.referencePrice)];
    if (dto.categoryId) conds.push(eq(storeProducts.categoryId, dto.categoryId));
    const rows = await this.db
      .update(storeProducts)
      .set({ price: sql`(round(${storeProducts.referencePrice} * ${factor}::numeric / ${round}) * ${round})::int` })
      .where(and(...conds))
      .returning({ id: storeProducts.id });
    return { ok: true, label: `${rows.length} precios (lista ${dto.percent >= 0 ? '+' : ''}${dto.percent} %)` };
  }

  async adminSummary() {
    const [[tot], [noPrice], [custom], [noStock], [hidden]] = await Promise.all([
      this.db.select({ n: count() }).from(storeProducts),
      this.db.select({ n: count() }).from(storeProducts).where(sql`${storeProducts.price} is null`),
      this.db.select({ n: count() }).from(storeProducts).where(sql`${storeProducts.price} is distinct from ${storeProducts.referencePrice}`),
      this.db.select({ n: count() }).from(storeProducts).where(eq(storeProducts.inStock, false)),
      this.db.select({ n: count() }).from(storeProducts).where(eq(storeProducts.active, false)),
    ]);
    return { total: tot.n, noPrice: noPrice.n, custom: custom.n, noStock: noStock.n, hidden: hidden.n };
  }

  // ---------------------------------------------------------------- panel: categorías
  async createCategory(dto: StoreCategoryDto) {
    const slug = await uniqueSlug(dto.slug || dto.name, async (s) => !!(await this.db.query.storeCategories.findFirst({ where: eq(storeCategories.slug, s) })));
    const [{ max }] = await this.db.select({ max: sql<number>`coalesce(max(${storeCategories.sortOrder}), 0)` }).from(storeCategories);
    const [row] = await this.db.insert(storeCategories).values({ ...dto, slug, sortOrder: Number(max) + 1 }).returning();
    return row;
  }

  async updateCategory(id: string, dto: Partial<StoreCategoryDto>) {
    const data = { ...dto };
    if (data.slug) {
      const s = slugify(data.slug);
      const taken = await this.db.query.storeCategories.findFirst({ where: and(eq(storeCategories.slug, s), ne(storeCategories.id, id)) });
      if (taken) throw new BadRequestException('Ya hay otra categoría con esa dirección');
      data.slug = s;
    }
    const [row] = await this.db.update(storeCategories).set(data).where(eq(storeCategories.id, id)).returning();
    if (!row) throw new NotFoundException('Categoría no encontrada');
    return row;
  }

  async removeCategory(id: string) {
    const [{ n }] = await this.db.select({ n: count() }).from(storeProducts).where(eq(storeProducts.categoryId, id));
    if (n > 0) throw new BadRequestException(`La categoría tiene ${n} productos: movelos o ocultá la categoría`);
    const [row] = await this.db.delete(storeCategories).where(eq(storeCategories.id, id)).returning();
    if (!row) throw new NotFoundException('Categoría no encontrada');
    return row;
  }

  reorderCategories(ids: string[]) {
    return reorderRows(this.db, storeCategories, ids);
  }
}
