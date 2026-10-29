import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { count, eq, isNotNull } from 'drizzle-orm';
import { resolve } from 'path';
import { uniqueSlug } from '../common/utils/slug';
import { Database, InjectDb } from '../db/db.module';
import { media, settings, storeCategories, storeProducts } from '../db/schema';
import { processImage } from '../media/image-pipeline';
import { RevalidateService } from '../revalidate/revalidate.service';
import { EXCLUDED_NAME, STORE_CATEGORIES, SUPPLIER_SOURCES } from './store.catalog';

export interface SupplierItem {
  sourceId: string;
  name: string;
  brand: string | null;
  sku: string | null;
  price: number | null;
  inStock: boolean;
  imageFile: string | null;
  category: string;
  subcategory: string;
}

export interface ImportStatus {
  running: boolean;
  phase: 'idle' | 'catalog' | 'products' | 'done' | 'error';
  startedAt: string | null;
  finishedAt: string | null;
  found: number;
  done: number;
  created: number;
  updated: number;
  failed: number;
  error: string | null;
}

const UA = 'Mozilla/5.0 (compatible; MartinoGrafica/1.0; +catalogo)';
const SETTING_KEY = 'storeImport';

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', deg: '°', ordm: 'º', frac12: '½' };
export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, k) => ENTITIES[k] ?? m);
}

/** Limpia el nombre que viene del proveedor: espacios, mayúsculas gritadas y su propia marca */
export function cleanName(raw: string) {
  let s = decodeEntities(raw).replace(/\s+/g, ' ').replace(/\s*[-–]?\s*vinilplata\b/gi, '').trim();
  if (s.length > 6 && s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}

/** "$12.500,00" o "12500.00" → 12500 */
export function parsePrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const t = raw.trim();
  const n = /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Saca los productos de la respuesta HTML del listado del proveedor (tarjetas + microdatos schema.org) */
export function parseListing(html: string, category: string, subcategory: string): SupplierItem[] {
  const out: SupplierItem[] = [];
  const chunks = html.split('carta-producto carrito-producto').slice(1);
  for (const c of chunks) {
    const meta = (k: string) => c.match(new RegExp(`itemprop="${k}" content="([^"]*)"`))?.[1];
    const sourceId = meta('productID') ?? c.match(/data-producto="([a-f0-9]{16,})"/)?.[1];
    const rawName = meta('name') ?? c.match(/descripcion-producto[^>]*>\s*<span>([^<]+)<\/span>/)?.[1];
    if (!sourceId || !rawName) continue;
    const name = cleanName(rawName);
    if (!name || EXCLUDED_NAME.test(name)) continue;
    const brandRaw = meta('brand') ? decodeEntities(meta('brand')!).trim() : '';
    out.push({
      sourceId,
      name,
      brand: brandRaw && !/vinilplata/i.test(brandRaw) ? brandRaw : null,
      sku: meta('sku') ? decodeEntities(meta('sku')!).trim() || null : null,
      price: parsePrice(meta('price')) ?? parsePrice(c.match(/<span>\s*(\$[\d.,]+)\s*<\/span>/)?.[1]),
      inStock: !/>\s*Sin stock\s*</i.test(c),
      imageFile: c.match(/fotos\/productos\/300\/([^"'\s>]+)/)?.[1] ?? null,
      category,
      subcategory,
    });
  }
  return out;
}

/**
 * Catálogo de referencia del proveedor: trae productos, precios de lista, stock y fotos,
 * y los carga en la tienda. Al volver a correrlo actualiza precio de lista y stock sin pisar lo editado a mano.
 */
@Injectable()
export class StoreImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Tienda');
  private readonly base: string;
  private readonly uploadsDir: string;
  private state: ImportStatus = { running: false, phase: 'idle', startedAt: null, finishedAt: null, found: 0, done: 0, created: 0, updated: 0, failed: 0, error: null };

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly revalidate: RevalidateService,
    private readonly config: ConfigService,
  ) {
    this.base = (config.get<string>('STORE_SUPPLIER_URL') ?? 'https://vinilplata.com.ar').replace(/\/$/, '');
    this.uploadsDir = resolve(config.get<string>('UPLOADS_DIR') ?? './uploads');
  }

  async onApplicationBootstrap() {
    try {
      await this.ensureCategories();
      if (this.config.get('STORE_AUTO_IMPORT') === 'false') return;
      const last = await this.db.query.settings.findFirst({ where: eq(settings.key, SETTING_KEY) });
      const ok = (last?.value as { ok?: boolean } | undefined)?.ok;
      if (!ok) {
        this.logger.log('Tienda sin catálogo importado: se carga en segundo plano');
        setTimeout(() => void this.run(), 4000);
      }
    } catch (err) {
      this.logger.error(`No se pudo preparar la tienda: ${(err as Error).message}`);
    }
  }

  status(): ImportStatus {
    return { ...this.state };
  }

  async ensureCategories() {
    const existing = await this.db.select({ slug: storeCategories.slug }).from(storeCategories);
    const have = new Set(existing.map((e) => e.slug));
    const missing = STORE_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })).filter((c) => !have.has(c.slug));
    if (missing.length && existing.length === 0) await this.db.insert(storeCategories).values(missing).onConflictDoNothing();
  }

  /** Arranca la importación en segundo plano (si no hay otra corriendo) */
  start() {
    if (!this.state.running) void this.run();
    return this.status();
  }

  private async fetchText(url: string, init: RequestInit = {}, tries = 3): Promise<string> {
    for (let i = 1; ; i++) {
      try {
        const res = await fetch(url, { ...init, headers: { 'user-agent': UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(45_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (err) {
        if (i >= tries) throw err;
        await new Promise((r) => setTimeout(r, 1500 * i));
      }
    }
  }

  private async fetchBuffer(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  /** Lista de una categoría del proveedor: la página trae el filtro y el listado llega por POST */
  async fetchCategory(path: string): Promise<string> {
    const page = await this.fetchText(`${this.base}/productos/${path}`);
    const val = (k: string) => decodeEntities(page.match(new RegExp(`id="listado-productos-${k}"[^>]*value="([^"]*)"`))?.[1] ?? '');
    const filtro = val('filtro');
    if (!filtro) return '';
    const body = new URLSearchParams({
      'carga-por-ajax': '1',
      __filtros_bucle: filtro,
      listado_inicio: '0',
      listado_cantidad: '3000',
      __vista_productos: val('vista') || 'mosaico',
      __orden_productos: val('orden') || 'predt',
    });
    return this.fetchText(`${this.base}/cargar_productos.php`, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
    });
  }

  private async image(file: string, alt: string): Promise<string | null> {
    const buf = (await this.fetchBuffer(`${this.base}/fotos/productos/600/${file}`)) ?? (await this.fetchBuffer(`${this.base}/fotos/productos/300/${file}`));
    if (!buf || buf.length < 400) return null;
    try {
      const img = await processImage(buf, this.uploadsDir, { folder: 'tienda', quality: 80 });
      const [row] = await this.db.insert(media).values({ kind: 'IMAGE', ...img, alt, source: 'tienda', sortOrder: 0 }).returning({ id: media.id });
      return row.id;
    } catch {
      return null;
    }
  }

  async run() {
    if (this.state.running) return;
    this.state = { running: true, phase: 'catalog', startedAt: new Date().toISOString(), finishedAt: null, found: 0, done: 0, created: 0, updated: 0, failed: 0, error: null };
    try {
      await this.ensureCategories();
      const cats = await this.db.select({ id: storeCategories.id, slug: storeCategories.slug }).from(storeCategories);
      const catId = new Map(cats.map((c) => [c.slug, c.id]));

      // 1. Catálogo (sin repetir productos que figuran en dos categorías)
      const items = new Map<string, SupplierItem>();
      for (const src of SUPPLIER_SOURCES) {
        if (!catId.has(src.category)) continue;
        try {
          const html = await this.fetchCategory(src.path);
          for (const it of parseListing(html, src.category, src.subcategory)) if (!items.has(it.sourceId)) items.set(it.sourceId, it);
        } catch (err) {
          this.logger.warn(`No se pudo leer ${src.path}: ${(err as Error).message}`);
        }
      }
      this.state.found = items.size;
      if (!items.size) throw new Error('El catálogo del proveedor no devolvió productos');

      // 2. Productos (de a 4 en paralelo por las fotos)
      this.state.phase = 'products';
      const existing = await this.db
        .select({ id: storeProducts.id, sourceId: storeProducts.sourceId, price: storeProducts.price, referencePrice: storeProducts.referencePrice, imageId: storeProducts.imageId })
        .from(storeProducts)
        .where(isNotNull(storeProducts.sourceId));
      const bySource = new Map(existing.map((e) => [e.sourceId!, e]));
      const list = [...items.values()];
      const now = new Date();
      let cursor = 0;
      const worker = async () => {
        while (cursor < list.length) {
          const it = list[cursor++];
          try {
            const prev = bySource.get(it.sourceId);
            if (prev) {
              // El precio se actualiza sólo si nadie lo cambió a mano (sigue igual al de lista anterior)
              const followList = prev.price == null || prev.price === prev.referencePrice;
              const patch: Partial<typeof storeProducts.$inferInsert> = { referencePrice: it.price, inStock: it.inStock, syncedAt: now };
              if (followList) patch.price = it.price;
              if (!prev.imageId && it.imageFile) patch.imageId = await this.image(it.imageFile, it.name);
              await this.db.update(storeProducts).set(patch).where(eq(storeProducts.id, prev.id));
              this.state.updated++;
            } else {
              const imageId = it.imageFile ? await this.image(it.imageFile, it.name) : null;
              const slug = await uniqueSlug(it.name, async (s) => !!(await this.db.query.storeProducts.findFirst({ where: eq(storeProducts.slug, s), columns: { id: true } })));
              await this.db
                .insert(storeProducts)
                .values({
                  slug,
                  name: it.name,
                  categoryId: catId.get(it.category)!,
                  subcategory: it.subcategory,
                  brand: it.brand,
                  sku: it.sku,
                  price: it.price,
                  referencePrice: it.price,
                  inStock: it.inStock,
                  imageId,
                  source: 'proveedor',
                  sourceId: it.sourceId,
                  syncedAt: now,
                })
                .onConflictDoNothing();
              this.state.created++;
            }
          } catch (err) {
            this.state.failed++;
            if (this.state.failed < 5) this.logger.warn(`Producto "${it.name}": ${(err as Error).message}`);
          }
          this.state.done++;
          if (this.state.done % 50 === 0) {
            this.logger.log(`Tienda: ${this.state.done}/${list.length} productos`);
            this.revalidate.trigger(['store']);
          }
        }
      };
      // Dos a la vez: con más, el procesado de fotos pasa el límite de memoria de PM2
      await Promise.all(Array.from({ length: 2 }, worker));

      this.state.phase = 'done';
      this.state.finishedAt = new Date().toISOString();
      await this.saveResult(true);
      this.logger.log(`Tienda lista: ${this.state.created} nuevos, ${this.state.updated} actualizados, ${this.state.failed} con error`);
    } catch (err) {
      this.state.phase = 'error';
      this.state.error = (err as Error).message;
      this.state.finishedAt = new Date().toISOString();
      await this.saveResult(false).catch(() => undefined);
      this.logger.error(`Importación de la tienda: ${this.state.error}`);
    } finally {
      this.state.running = false;
      this.revalidate.trigger(['store']);
    }
  }

  private async saveResult(ok: boolean) {
    const value = { ok, at: new Date().toISOString(), found: this.state.found, created: this.state.created, updated: this.state.updated, failed: this.state.failed, error: this.state.error };
    await this.db.insert(settings).values({ key: SETTING_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  async lastResult() {
    const row = await this.db.query.settings.findFirst({ where: eq(settings.key, SETTING_KEY) });
    const [{ n }] = await this.db.select({ n: count() }).from(storeProducts);
    return { last: (row?.value ?? null) as Record<string, unknown> | null, products: n };
  }
}
