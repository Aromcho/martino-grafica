/**
 * Lectura de datos desde componentes de servidor.
 * Pega directo a la API (NestJS) con caché de datos de Next y etiquetas para revalidar al instante.
 */
import type { Banner, Category, Highlight, Paginated, Product, ProductDetail, PublicBusiness, SearchResults, WorkCard, WorkDetail, WorkFacets } from './types';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tag = 'business' | 'catalog' | 'works' | 'content';

export async function apiGet<T>(path: string, tags: Tag[], revalidate = 3600): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate, tags }, headers: { accept: 'application/json' } });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} en ${path}`);
  return (await res.json()) as T;
}

/** Igual que apiGet pero con valor por defecto si la API no responde (el sitio nunca se cae) */
export async function apiSafe<T>(path: string, fallback: T, tags: Tag[], revalidate?: number): Promise<T> {
  try {
    return await apiGet<T>(path, tags, revalidate);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[api]', (err as Error).message);
    return fallback;
  }
}

async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

const emptyBusiness: PublicBusiness = {
  info: null,
  hours: {
    configured: false,
    season: 'REGULAR',
    seasonConfig: { mode: 'AUTO', summerStart: '12-15', summerEnd: '03-15' },
    weekday: 0,
    isOpen: false,
    closesAt: null,
    closingSoon: false,
    next: null,
    today: [],
    todaySpecial: null,
    upcomingSpecialDays: [],
    weeks: { REGULAR: [], SUMMER: [] },
    hasSummer: false,
  },
  counts: { works: 0, products: 0 },
};

// El estado "abierto ahora" cambia con la hora: se refresca cada minuto
export const getBusiness = () => apiSafe<PublicBusiness>('/business', emptyBusiness, ['business'], 60);
export const getCategories = () => apiSafe<Category[]>('/categories', [], ['catalog', 'works']);
export const getProducts = (p: { category?: string; featured?: boolean; limit?: number } = {}) =>
  apiSafe<Product[]>(`/products${qs(p)}`, [], ['catalog']);
export const getProduct = (slug: string) => orNull(apiGet<ProductDetail>(`/products/${encodeURIComponent(slug)}?view=0`, ['catalog', 'works']));
export const getWorks = (p: { category?: string; location?: string; q?: string; featured?: boolean; page?: number; pageSize?: number } = {}) =>
  apiSafe<Paginated<WorkCard>>(`/works${qs(p)}`, { items: [], total: 0, page: 1, pageSize: 24, pages: 1 }, ['works']);
export const getWorkFacets = () => apiSafe<WorkFacets>('/works/facets', { categories: [], locations: [], years: [] }, ['works']);
export const getWork = (slug: string) => orNull(apiGet<WorkDetail>(`/works/${encodeURIComponent(slug)}?view=0`, ['works', 'catalog']));
export const getHighlights = () => apiSafe<Highlight[]>('/highlights', [], ['content']);
export const getBanners = (placement?: string) => apiSafe<Banner[]>(`/banners${qs({ placement })}`, [], ['content'], 600);
export const search = (q: string) =>
  apiSafe<SearchResults>(`/search${qs({ q })}`, { q, products: [], works: [], categories: [] }, ['catalog', 'works'], 300);
export const getSitemap = () =>
  apiSafe<{ products: { slug: string; updatedAt: string }[]; works: { slug: string; updatedAt: string }[]; categories: { slug: string; updatedAt: string }[] }>(
    '/sitemap',
    { products: [], works: [], categories: [] },
    ['catalog', 'works'],
  );
