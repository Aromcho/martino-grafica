/** Tipos de datos que devuelve la API (NestJS) */

export type MediaVariants = { sm: string; md: string; lg: string };

export interface Media {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  path: string;
  variants: MediaVariants | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  dominantColor: string | null;
  alt: string | null;
}

export interface MediaFull extends Media {
  mime: string | null;
  sizeBytes: number | null;
  source: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CategoryRef {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
}

export interface Category extends CategoryRef {
  shortName: string | null;
  tagline: string | null;
  description: string | null;
  materials: string[];
  cover: Media | null;
  coverId: string | null;
  sortOrder: number;
  featured: boolean;
  active: boolean;
  productCount: number;
  workCount: number;
}

export type PriceTier = { minQty: number; price: number; label?: string };
export type SizeOption = { label: string; width?: number; height?: number };
export type QuoteMode = 'AREA' | 'UNITS' | 'CUSTOM';

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  category: CategoryRef;
  summary: string | null;
  description: string | null;
  priceFrom: number | null;
  priceTiers: PriceTier[];
  priceNote: string | null;
  unit: string;
  leadTime: string | null;
  materials: string[];
  finishes: string[];
  features: string[];
  sizes: SizeOption[];
  specs: Record<string, string>;
  quoteMode: QuoteMode;
  minQty: number;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  views: number;
  cover: Media | null;
  images: Media[];
  updatedAt: string;
}

export interface WorkCard {
  id: string;
  slug: string;
  title: string;
  client: string | null;
  location: string | null;
  doneAt: string | null;
  summary: string | null;
  materials: string[];
  featured: boolean;
  active: boolean;
  sortOrder: number;
  views: number;
  categoryId: string;
  productId?: string | null;
  category: CategoryRef;
  cover: Media | null;
  preview: Media[];
  imageCount: number;
  instagramCode: string | null;
}

export interface WorkDetail extends Omit<WorkCard, 'preview' | 'imageCount'> {
  description: string | null;
  images: Media[];
  product: Pick<Product, 'id' | 'slug' | 'name' | 'summary' | 'priceFrom' | 'quoteMode'> | null;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  related: WorkCard[];
  updatedAt: string;
}

export interface ProductDetail extends Product {
  relatedWorks: { id: string; slug: string; title: string; client: string | null; location: string | null; doneAt: string | null; cover: Media | null }[];
  siblings: Product[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface WorkFacets {
  categories: { slug: string; name: string; shortName: string | null; n: number }[];
  locations: { location: string; n: number }[];
  years: { year: number; n: number }[];
}

export interface HighlightItem {
  id: string;
  mediaId: string;
  media: Media;
  caption: string | null;
  workId: string | null;
  productId: string | null;
  work: { id: string; slug: string; title: string } | null;
  product: { id: string; slug: string; name: string } | null;
  linkUrl: string | null;
  durationMs: number;
  sortOrder: number;
}

export interface Highlight {
  id: string;
  slug: string;
  title: string;
  coverId: string | null;
  cover: Media | null;
  categoryId: string | null;
  category: CategoryRef | null;
  sortOrder: number;
  active: boolean;
  items: HighlightItem[];
}

export interface Banner {
  id: string;
  placement: 'HOME_HERO' | 'HOME_STRIP' | 'SERVICES';
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  mediaId: string | null;
  media: Media | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  description: string;
  owner?: string;
  phone: string;
  whatsapp: string;
  whatsappGreeting?: string;
  email?: string;
  address: string;
  crossStreets?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
  instagram: string;
  instagramUrl: string;
  serviceArea: string[];
  shipping?: string;
  paymentMethods: string[];
  credentials?: string;
  motto?: string;
  stats?: { posts?: number; followers?: number; since?: number };
}

export type Season = 'REGULAR' | 'SUMMER';
export type Range = { opens: string; closes: string };

export interface HoursStatus {
  configured: boolean;
  season: Season;
  seasonConfig: { mode: 'AUTO' | Season; summerStart: string; summerEnd: string };
  weekday: number;
  isOpen: boolean;
  closesAt: string | null;
  closingSoon: boolean;
  next: { weekday: number; dayLabel: string; opens: string } | null;
  today: Range[];
  todaySpecial: { label: string; closed: boolean } | null;
  upcomingSpecialDays: { id: string; date: string; label: string; closed: boolean; opens: string | null; closes: string | null }[];
  weeks: Record<Season, { weekday: number; label: string; ranges: Range[] }[]>;
  hasSummer: boolean;
}

export interface PublicBusiness {
  info: BusinessInfo | null;
  hours: HoursStatus;
  counts: { works: number; products: number };
}

export interface SearchResults {
  q: string;
  products: (Pick<Product, 'id' | 'slug' | 'name' | 'summary' | 'priceFrom' | 'cover'> & { category: CategoryRef })[];
  works: { id: string; slug: string; title: string; client: string | null; location: string | null; doneAt: string | null; cover: Media | null; category: { slug: string; name: string } }[];
  categories: { id: string; slug: string; name: string; tagline: string | null; cover: Media | null }[];
}

// ---------------------------------------------------------------- panel
export type Role = 'ADMIN' | 'EDITOR';
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export type QuoteStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'APPROVED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type DeliveryMethod = 'PICKUP' | 'INSTALL' | 'SHIPPING';

export interface Quote {
  id: string;
  code: string;
  kind: 'QUOTE' | 'CONTACT';
  status: QuoteStatus;
  customerName: string;
  phone: string;
  email: string | null;
  city: string | null;
  productId: string | null;
  productName: string | null;
  categoryId: string | null;
  width: string | null;
  height: string | null;
  quantity: number;
  material: string | null;
  finish: string | null;
  size: string | null;
  needsDesign: boolean;
  delivery: DeliveryMethod;
  deadline: string | null;
  message: string | null;
  estimate: number | null;
  quotedPrice: number | null;
  adminNotes: string | null;
  source: string;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

export interface QuoteDetail extends Quote {
  files: { id: string; originalName: string; mime: string | null; sizeBytes: number | null; createdAt: string }[];
  events: { id: string; type: string; fromStatus: QuoteStatus | null; toStatus: QuoteStatus | null; note: string | null; createdAt: string; user: { name: string } | null }[];
  product: { id: string; slug: string; name: string } | null;
  category: { id: string; name: string } | null;
  whatsappUrl: string;
  customerWhatsapp: string;
}

export interface QuoteList extends Paginated<Quote> {
  byStatus: Partial<Record<QuoteStatus, number>>;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  label: string | null;
  createdAt: string;
  userName: string | null;
}

export interface AdminStats {
  totals: { quotesNew: number; quotes7: number; quotes30: number; inProgress: number; works: number; products: number; categories: number; highlights: number; media: number };
  byStatus: Partial<Record<QuoteStatus, number>>;
  daily: { day: string; count: number }[];
  recentQuotes: Quote[];
  topWorks: { id: string; slug: string; title: string; views: number; cover: Media | null }[];
  topProducts: { id: string; slug: string; name: string; views: number }[];
  topRequested: { name: string; n: number }[];
  hours: { configured: boolean; isOpen: boolean; closesAt: string | null; next: HoursStatus['next'] };
  activity: ActivityItem[];
}
