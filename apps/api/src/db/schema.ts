/**
 * Modelo de datos — Martino Gráfica
 * PostgreSQL + Drizzle ORM. Precios en pesos enteros (ARS). Medidas en centímetros.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------- enums
export const roleEnum = pgEnum('role', ['ADMIN', 'EDITOR']);
export const mediaKindEnum = pgEnum('media_kind', ['IMAGE', 'VIDEO']);
export const seasonEnum = pgEnum('season', ['REGULAR', 'SUMMER']);
export const quoteStatusEnum = pgEnum('quote_status', [
  'NEW',
  'CONTACTED',
  'QUOTED',
  'APPROVED',
  'IN_PRODUCTION',
  'READY',
  'DELIVERED',
  'CANCELLED',
]);
export const quoteKindEnum = pgEnum('quote_kind', ['QUOTE', 'CONTACT', 'ORDER']);
export const deliveryEnum = pgEnum('delivery_method', ['PICKUP', 'INSTALL', 'SHIPPING']);
export const quoteModeEnum = pgEnum('quote_mode', ['AREA', 'UNITS', 'CUSTOM']);
export const bannerPlacementEnum = pgEnum('banner_placement', ['HOME_HERO', 'HOME_STRIP', 'SERVICES']);

export type Role = (typeof roleEnum.enumValues)[number];
export type MediaKind = (typeof mediaKindEnum.enumValues)[number];
export type Season = (typeof seasonEnum.enumValues)[number];
export type QuoteStatus = (typeof quoteStatusEnum.enumValues)[number];
export type QuoteKind = (typeof quoteKindEnum.enumValues)[number];
export type DeliveryMethod = (typeof deliveryEnum.enumValues)[number];
export type QuoteMode = (typeof quoteModeEnum.enumValues)[number];
export type BannerPlacement = (typeof bannerPlacementEnum.enumValues)[number];

// ---------------------------------------------------------------- helpers
const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const textArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

export type MediaVariants = { sm: string; md: string; lg: string };
export type PriceTier = { minQty: number; price: number; label?: string };
export type SizeOption = { label: string; width?: number; height?: number };

// ---------------------------------------------------------------- usuarios y medios
export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('EDITOR'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const media = pgTable(
  'media',
  {
    id: id(),
    kind: mediaKindEnum('kind').notNull().default('IMAGE'),
    /** Ruta relativa dentro de /uploads (variante principal) */
    path: text('path').notNull(),
    variants: jsonb('variants').$type<MediaVariants>(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt'),
    blurDataUrl: text('blur_data_url'),
    dominantColor: text('dominant_color'),
    mime: text('mime'),
    sizeBytes: integer('size_bytes'),
    /** Orden manual en la biblioteca (arrastrar y soltar) */
    sortOrder: integer('sort_order').notNull().default(0),
    /** Origen: "instagram:<código>", "historia:<destacada>", "kling:<nombre>", "upload" */
    source: text('source'),
    createdAt: createdAt(),
  },
  (t) => [index('media_sort_idx').on(t.sortOrder, t.createdAt)],
);

// ---------------------------------------------------------------- rubros y servicios
export const categories = pgTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Nombre corto para chips y filtros */
  shortName: text('short_name'),
  tagline: text('tagline'),
  description: text('description'),
  /** Materiales y técnicas típicas del rubro */
  materials: textArray('materials'),
  coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  featured: boolean('featured').notNull().default(true),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable(
  'products',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    summary: text('summary'),
    description: text('description'),
    /** Precio publicado "desde" (por unidad), en pesos. Null = a cotizar */
    priceFrom: integer('price_from'),
    /** Escala de precios por cantidad (remeras, gorras) */
    priceTiers: jsonb('price_tiers').$type<PriceTier[]>().notNull().default(sql`'[]'::jsonb`),
    /** Aclaración del precio: "Precio por unidad", "Publicado en febrero 2026" */
    priceNote: text('price_note'),
    /** "unidad", "m²", "kit", "vehículo" */
    unit: text('unit').notNull().default('unidad'),
    /** "1 a 5 días", "en el día" */
    leadTime: text('lead_time'),
    materials: textArray('materials'),
    finishes: textArray('finishes'),
    features: textArray('features'),
    sizes: jsonb('sizes').$type<SizeOption[]>().notNull().default(sql`'[]'::jsonb`),
    specs: jsonb('specs').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    /** Cómo se cotiza: por medida (ancho × alto), por cantidad o a medida */
    quoteMode: quoteModeEnum('quote_mode').notNull().default('CUSTOM'),
    minQty: integer('min_qty').notNull().default(1),
    featured: boolean('featured').notNull().default(false),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    views: integer('views').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('products_category_idx').on(t.categoryId), index('products_active_idx').on(t.active, t.sortOrder)],
);

export const productImages = pgTable(
  'product_images',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('product_images_uq').on(t.productId, t.mediaId)],
);

// ---------------------------------------------------------------- tienda (insumos y productos para vender)
export const storeCategories = pgTable('store_categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const storeProducts = pgTable(
  'store_products',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => storeCategories.id, { onDelete: 'restrict' }),
    /** Sub-rubro dentro de la categoría: "Vinilos de corte", "Papel para sublimar" */
    subcategory: text('subcategory'),
    brand: text('brand'),
    sku: text('sku'),
    description: text('description'),
    /** Precio final en pesos. Null = "Consultar precio" */
    price: integer('price'),
    /** Último precio de lista del proveedor (para recalcular con un % y detectar cambios) */
    referencePrice: integer('reference_price'),
    unit: text('unit').notNull().default('unidad'),
    inStock: boolean('in_stock').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    views: integer('views').notNull().default(0),
    /** Unidades pedidas desde la web (para "más pedidos") */
    ordered: integer('ordered').notNull().default(0),
    imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
    /** Origen del catálogo: "proveedor" (importado) o "manual" */
    source: text('source').notNull().default('manual'),
    /** Id del producto en el catálogo del proveedor (para actualizar precios sin duplicar) */
    sourceId: text('source_id').unique(),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('store_products_category_idx').on(t.categoryId), index('store_products_active_idx').on(t.active, t.sortOrder)],
);

/** Renglones de un pedido de compra (quotes.kind = ORDER) */
export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => storeProducts.id, { onDelete: 'set null' }),
    /** Nombre, código y precio al momento del pedido */
    name: text('name').notNull(),
    sku: text('sku'),
    unitPrice: integer('unit_price'),
    quantity: integer('quantity').notNull().default(1),
    subtotal: integer('subtotal'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('order_items_quote_idx').on(t.quoteId)],
);

// ---------------------------------------------------------------- portfolio
export const works = pgTable(
  'works',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /** Comercio o cliente (cuando se publicó) */
    client: text('client'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    /** Servicio principal relacionado (para "Pedí uno así") */
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    location: text('location'),
    doneAt: date('done_at', { mode: 'string' }),
    summary: text('summary'),
    description: text('description'),
    materials: textArray('materials'),
    coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
    featured: boolean('featured').notNull().default(false),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    views: integer('views').notNull().default(0),
    /** Publicación original de Instagram */
    instagramCode: text('instagram_code'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('works_category_idx').on(t.categoryId),
    index('works_active_idx').on(t.active, t.doneAt),
  ],
);

export const workImages = pgTable(
  'work_images',
  {
    id: id(),
    workId: uuid('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('work_images_uq').on(t.workId, t.mediaId)],
);

// ---------------------------------------------------------------- historias y banners
export const highlights = pgTable('highlights', {
  id: id(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const highlightItems = pgTable('highlight_items', {
  id: id(),
  highlightId: uuid('highlight_id')
    .notNull()
    .references(() => highlights.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id')
    .notNull()
    .references(() => media.id, { onDelete: 'cascade' }),
  caption: text('caption'),
  workId: uuid('work_id').references(() => works.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  linkUrl: text('link_url'),
  durationMs: integer('duration_ms').notNull().default(5000),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const banners = pgTable('banners', {
  id: id(),
  placement: bannerPlacementEnum('placement').notNull().default('HOME_STRIP'),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  ctaLabel: text('cta_label'),
  ctaHref: text('cta_href'),
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
  active: boolean('active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- horarios y ajustes
/** Franjas por temporada y día (0 = domingo … 6 = sábado) */
export const openingHours = pgTable(
  'opening_hours',
  {
    id: id(),
    season: seasonEnum('season').notNull().default('REGULAR'),
    weekday: integer('weekday').notNull(),
    opens: text('opens').notNull(),
    closes: text('closes').notNull(),
  },
  (t) => [index('opening_hours_idx').on(t.season, t.weekday)],
);

export const specialDays = pgTable('special_days', {
  id: id(),
  date: date('date', { mode: 'string' }).notNull(),
  label: text('label').notNull(),
  closed: boolean('closed').notNull().default(true),
  opens: text('opens'),
  closes: text('closes'),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- pedidos y presupuestos
export const quotes = pgTable(
  'quotes',
  {
    id: id(),
    /** Código corto para hablar por WhatsApp: MG-2611-4821 */
    code: text('code').notNull().unique(),
    kind: quoteKindEnum('kind').notNull().default('QUOTE'),
    status: quoteStatusEnum('status').notNull().default('NEW'),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    city: text('city'),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    /** Nombre del producto/servicio al momento del pedido */
    productName: text('product_name'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    width: numeric('width_cm', { precision: 8, scale: 1 }),
    height: numeric('height_cm', { precision: 8, scale: 1 }),
    quantity: integer('quantity').notNull().default(1),
    material: text('material'),
    finish: text('finish'),
    size: text('size'),
    needsDesign: boolean('needs_design').notNull().default(false),
    delivery: deliveryEnum('delivery').notNull().default('PICKUP'),
    deadline: date('deadline', { mode: 'string' }),
    message: text('message'),
    /** Estimado automático según la escala publicada (si existe) */
    estimate: integer('estimate'),
    /** Precio que pasó el taller */
    quotedPrice: integer('quoted_price'),
    adminNotes: text('admin_notes'),
    source: text('source').notNull().default('web'),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('quotes_status_idx').on(t.status, t.createdAt), index('quotes_created_idx').on(t.createdAt)],
);

export const quoteFiles = pgTable('quote_files', {
  id: id(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  /** Ruta relativa dentro de PRIVATE_DIR (no se sirve en público) */
  path: text('path').notNull(),
  originalName: text('original_name').notNull(),
  mime: text('mime'),
  sizeBytes: integer('size_bytes'),
  createdAt: createdAt(),
});

export const quoteEvents = pgTable('quote_events', {
  id: id(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  /** created | status | note | price | whatsapp */
  type: text('type').notNull(),
  fromStatus: quoteStatusEnum('from_status'),
  toStatus: quoteStatusEnum('to_status'),
  note: text('note'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

/** Registro de actividad del panel (para el dashboard) */
export const activity = pgTable(
  'activity',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    label: text('label'),
    createdAt: createdAt(),
  },
  (t) => [index('activity_created_idx').on(t.createdAt)],
);

// ---------------------------------------------------------------- relaciones (para db.query)
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  cover: one(media, { fields: [categories.coverId], references: [media.id] }),
  products: many(products),
  works: many(works),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  works: many(works),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  media: one(media, { fields: [productImages.mediaId], references: [media.id] }),
}));

export const worksRelations = relations(works, ({ one, many }) => ({
  category: one(categories, { fields: [works.categoryId], references: [categories.id] }),
  product: one(products, { fields: [works.productId], references: [products.id] }),
  cover: one(media, { fields: [works.coverId], references: [media.id] }),
  images: many(workImages),
}));

export const workImagesRelations = relations(workImages, ({ one }) => ({
  work: one(works, { fields: [workImages.workId], references: [works.id] }),
  media: one(media, { fields: [workImages.mediaId], references: [media.id] }),
}));

export const highlightsRelations = relations(highlights, ({ one, many }) => ({
  cover: one(media, { fields: [highlights.coverId], references: [media.id] }),
  category: one(categories, { fields: [highlights.categoryId], references: [categories.id] }),
  items: many(highlightItems),
}));

export const highlightItemsRelations = relations(highlightItems, ({ one }) => ({
  highlight: one(highlights, { fields: [highlightItems.highlightId], references: [highlights.id] }),
  media: one(media, { fields: [highlightItems.mediaId], references: [media.id] }),
  work: one(works, { fields: [highlightItems.workId], references: [works.id] }),
  product: one(products, { fields: [highlightItems.productId], references: [products.id] }),
}));

export const bannersRelations = relations(banners, ({ one }) => ({
  media: one(media, { fields: [banners.mediaId], references: [media.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  product: one(products, { fields: [quotes.productId], references: [products.id] }),
  category: one(categories, { fields: [quotes.categoryId], references: [categories.id] }),
  files: many(quoteFiles),
  events: many(quoteEvents),
  items: many(orderItems),
}));

export const storeCategoriesRelations = relations(storeCategories, ({ one, many }) => ({
  cover: one(media, { fields: [storeCategories.coverId], references: [media.id] }),
  products: many(storeProducts),
}));

export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  category: one(storeCategories, { fields: [storeProducts.categoryId], references: [storeCategories.id] }),
  image: one(media, { fields: [storeProducts.imageId], references: [media.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  quote: one(quotes, { fields: [orderItems.quoteId], references: [quotes.id] }),
  product: one(storeProducts, { fields: [orderItems.productId], references: [storeProducts.id] }),
}));

export const quoteFilesRelations = relations(quoteFiles, ({ one }) => ({
  quote: one(quotes, { fields: [quoteFiles.quoteId], references: [quotes.id] }),
}));

export const quoteEventsRelations = relations(quoteEvents, ({ one }) => ({
  quote: one(quotes, { fields: [quoteEvents.quoteId], references: [quotes.id] }),
  user: one(users, { fields: [quoteEvents.userId], references: [users.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  user: one(users, { fields: [activity.userId], references: [users.id] }),
}));
