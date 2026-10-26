/**
 * Carga inicial: usuario administrador, datos del negocio y todo el contenido relevado del Instagram
 * de @martino.grafica (rubros, servicios, trabajos, historias y banners) con sus fotos optimizadas.
 *
 *   npm run seed            → carga sólo si la base está vacía
 *   npm run seed -- --reset → borra el contenido y lo vuelve a cargar (no toca los presupuestos)
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { Pool } from 'pg';
import { processImage } from '../media/image-pipeline';
import * as schema from './schema';

type SeedImage = { file: string; alt?: string };
interface SeedContent {
  business: Record<string, unknown>;
  categories: {
    slug: string;
    name: string;
    shortName: string;
    tagline: string;
    description: string;
    materials: string[];
    sortOrder: number;
    cover: string | null;
  }[];
  products: (Omit<typeof schema.products.$inferInsert, 'categoryId' | 'id'> & { category: string; images: SeedImage[] })[];
  works: {
    slug: string;
    title: string;
    client: string | null;
    category: string;
    location: string | null;
    doneAt: string;
    summary: string;
    description: string | null;
    materials: string[];
    featured: boolean;
    instagramCode: string;
    images: SeedImage[];
  }[];
  highlights: { slug: string; title: string; category: string; sortOrder: number; items: SeedImage[] }[];
  banners: {
    placement: schema.BannerPlacement;
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    image: string | null;
    active?: boolean;
    startsAt?: string;
    endsAt?: string;
    sortOrder: number;
  }[];
}

function findSeedDir() {
  // Funciona con tsx (src/db) y compilado (dist/db)
  const candidates = [resolve(__dirname, '../../seed'), resolve(process.cwd(), 'seed'), resolve(process.cwd(), 'apps/api/seed')];
  const dir = candidates.find((d) => existsSync(join(d, 'content.json')));
  if (!dir) throw new Error('No encuentro seed/content.json');
  return dir;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const uploads = resolve(process.env.UPLOADS_DIR ?? './uploads');
  const seedDir = findSeedDir();
  const content = JSON.parse(readFileSync(join(seedDir, 'content.json'), 'utf8')) as SeedContent;

  // ---------------------------------------------------------------- admin
  const email = (process.env.ADMIN_EMAIL ?? 'admin@martinografica.com.ar').toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!existing) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword === 'se-genera-con-npm-run-env') {
      throw new Error('Definí una contraseña de administrador en apps/api/.env antes de cargar el seed.');
    }
    await db.insert(schema.users).values({
      email,
      name: process.env.ADMIN_NAME ?? 'Administración',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    });
    console.log(`✓ Usuario administrador: ${email}`);
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.categories);
  if (n > 0 && !reset) {
    console.log('· Ya hay contenido cargado. Para recargarlo desde cero: npm run seed:reset');
    await pool.end();
    return;
  }

  if (reset) {
    console.log('Borrando contenido anterior…');
    await db.execute(sql`TRUNCATE highlight_items, highlights, banners, work_images, works, product_images, products, categories, media, activity RESTART IDENTITY CASCADE`);
    await db.execute(sql`UPDATE quotes SET product_id = NULL, category_id = NULL`);
  }

  // ---------------------------------------------------------------- medios (con caché por archivo)
  const cache = new Map<string, string>();
  let processed = 0;
  const total = new Set<string>([
    ...content.works.flatMap((w) => w.images.map((i) => i.file)),
    ...content.products.flatMap((p) => p.images.map((i) => i.file)),
    ...content.highlights.flatMap((h) => h.items.map((i) => i.file)),
    ...content.banners.map((b) => b.image).filter(Boolean),
  ] as string[]).size;

  async function mediaFor(file: string, alt: string | undefined, source: string) {
    const hit = cache.get(file);
    if (hit) return hit;
    const abs = join(seedDir, 'images', file);
    const img = await processImage(abs, uploads, { folder: `seed/${dirname(file)}` });
    const [row] = await db
      .insert(schema.media)
      .values({ kind: 'IMAGE', ...img, alt: alt ?? null, source, sortOrder: processed })
      .returning({ id: schema.media.id });
    cache.set(file, row.id);
    processed++;
    if (processed % 25 === 0 || processed === total) process.stdout.write(`\r  Optimizando fotos ${processed}/${total}`);
    return row.id;
  }

  // ---------------------------------------------------------------- negocio
  const setting = (key: string, value: unknown) =>
    db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  await setting('business', content.business);
  await setting('season', { mode: 'AUTO', summerStart: '12-15', summerEnd: '03-15' });
  await setting('quote', {
    intro: 'Contanos qué necesitás y te pasamos el presupuesto por WhatsApp.',
    fileHint: 'Si tenés el diseño, subilo en PDF, AI, CDR, PSD, SVG, PNG o JPG (hasta 25 MB por archivo).',
  });
  console.log('✓ Datos del negocio');

  // ---------------------------------------------------------------- rubros
  const catIds = new Map<string, string>();
  for (const c of content.categories) {
    const [row] = await db
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, shortName: c.shortName, tagline: c.tagline, description: c.description, materials: c.materials, sortOrder: c.sortOrder })
      .returning({ id: schema.categories.id });
    catIds.set(c.slug, row.id);
  }
  console.log(`✓ ${content.categories.length} rubros`);

  // ---------------------------------------------------------------- servicios
  const productIds = new Map<string, string>();
  for (const p of content.products) {
    const { category, images, ...data } = p;
    const [row] = await db
      .insert(schema.products)
      .values({ ...data, categoryId: catIds.get(category)! })
      .returning({ id: schema.products.id });
    productIds.set(p.slug as string, row.id);
    for (const [i, img] of images.entries()) {
      const mediaId = await mediaFor(img.file, img.alt, 'instagram');
      await db.insert(schema.productImages).values({ productId: row.id, mediaId, sortOrder: i }).onConflictDoNothing();
    }
  }
  process.stdout.write('\n');
  console.log(`✓ ${content.products.length} servicios`);

  // Servicio principal sugerido para cada trabajo (para "Pedí uno así")
  const mainProduct: Record<string, string> = {
    'ploteo-vehicular': 'ploteo-rotulacion-vehicular',
    'motos-y-cuatris': 'full-wrap-motos',
    carteleria: 'cartel-lona-front',
    'vidrieras-y-esmerilados': 'ploteo-de-vidrieras',
    'calcos-y-stickers': 'calcos-con-tu-logo',
    'remeras-y-gorras': 'remera-estampada',
    'vinilo-decorativo': 'vinilo-decorativo-impreso',
    inmobiliarias: 'cartel-inmobiliario',
  };
  const guess = (w: SeedContent['works'][number]) => {
    const t = `${w.title} ${w.summary} ${w.materials.join(' ')}`.toLowerCase();
    if (/neón|neon/.test(t)) return 'neon-led';
    if (/corpóre|polyfan|polifan/.test(t) && w.category === 'carteleria') return 'letras-corporeas';
    if (/acrílico|acrilico|botón|luminoso/.test(t) && w.category === 'carteleria' && !/lona/.test(t)) return 'cartel-luminoso-acrilico';
    if (/esmerilad/.test(t) && w.category === 'vidrieras-y-esmerilados') return 'esmerilado';
    if (/kit|calcos/.test(t) && w.category === 'motos-y-cuatris' && !/wrap|forrad|cambio de color/.test(t)) return 'kit-calcos-motos';
    if (/gorra/.test(t) && !/remera/.test(t)) return 'gorra-trucker';
    if (/negro mate|forrad|full wrap/.test(t) && w.category === 'ploteo-vehicular') return 'forrado-cambio-de-color';
    if (/mapa/.test(t)) return 'mapas-de-zonificacion';
    if (/heladera|freezer/.test(t)) return 'forrado-heladeras-muebles';
    if (/piso|alto tránsito/.test(t)) return 'vinilo-alto-transito';
    if (/tarjeta/.test(t)) return 'tarjetas-personales';
    return mainProduct[w.category];
  };

  // ---------------------------------------------------------------- trabajos
  for (const [k, w] of content.works.entries()) {
    const ids: string[] = [];
    for (const img of w.images) ids.push(await mediaFor(img.file, img.alt, `instagram:${w.instagramCode}`));
    const [row] = await db
      .insert(schema.works)
      .values({
        slug: w.slug,
        title: w.title,
        client: w.client,
        categoryId: catIds.get(w.category)!,
        productId: productIds.get(guess(w)) ?? null,
        location: w.location,
        doneAt: w.doneAt,
        summary: w.summary,
        description: w.description,
        materials: w.materials,
        featured: w.featured,
        instagramCode: w.instagramCode,
        coverId: ids[0],
        sortOrder: k,
      })
      .returning({ id: schema.works.id });
    await db.insert(schema.workImages).values(ids.map((mediaId, i) => ({ workId: row.id, mediaId, sortOrder: i }))).onConflictDoNothing();
  }
  process.stdout.write('\n');
  console.log(`✓ ${content.works.length} trabajos`);

  // portadas de rubros
  for (const c of content.categories) {
    if (c.cover && cache.has(c.cover)) await db.update(schema.categories).set({ coverId: cache.get(c.cover)! }).where(eq(schema.categories.id, catIds.get(c.slug)!));
  }

  // ---------------------------------------------------------------- historias
  for (const h of content.highlights) {
    const ids: string[] = [];
    for (const it of h.items) ids.push(await mediaFor(it.file, `Historia destacada: ${h.title}`, `historia:${h.slug}`));
    const [row] = await db
      .insert(schema.highlights)
      .values({ slug: h.slug, title: h.title, categoryId: catIds.get(h.category) ?? null, sortOrder: h.sortOrder, coverId: ids[0] })
      .returning({ id: schema.highlights.id });
    await db.insert(schema.highlightItems).values(ids.map((mediaId, i) => ({ highlightId: row.id, mediaId, sortOrder: i, durationMs: 4500 })));
  }
  process.stdout.write('\n');
  console.log(`✓ ${content.highlights.length} historias destacadas`);

  // ---------------------------------------------------------------- banners
  for (const b of content.banners) {
    const mediaId = b.image ? await mediaFor(b.image, b.title, 'banner') : null;
    await db.insert(schema.banners).values({
      placement: b.placement,
      title: b.title,
      subtitle: b.subtitle ?? null,
      ctaLabel: b.ctaLabel ?? null,
      ctaHref: b.ctaHref ?? null,
      mediaId,
      active: b.active ?? true,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      sortOrder: b.sortOrder,
    });
  }
  console.log(`✓ ${content.banners.length} banners`);
  console.log(`✓ ${processed} fotos optimizadas (WebP 480/960/1600 + placeholder borroso) en ${uploads}`);
  console.log('· Horarios: no están publicados en Instagram. Cargalos desde el panel → Horarios.');
  await pool.end();
}

main().catch((err) => {
  console.error('\n✗ Error en el seed:', err);
  process.exit(1);
});
