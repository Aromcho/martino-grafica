import type { MetadataRoute } from 'next';
import { getSitemap } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, works, categories } = await getSitemap();
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/trabajos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/servicios`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/cotizar`, lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE_URL}/historias`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
  ];
  return [
    ...fixed,
    ...categories.map((c) => ({ url: `${SITE_URL}/trabajos?rubro=${c.slug}`, lastModified: new Date(c.updatedAt), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${SITE_URL}/servicios/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...works.map((w) => ({ url: `${SITE_URL}/trabajos/${w.slug}`, lastModified: new Date(w.updatedAt), changeFrequency: 'yearly' as const, priority: 0.6 })),
  ];
}
