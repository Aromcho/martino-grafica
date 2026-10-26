import { absoluteMediaUrl } from './media';
import { SITE_URL } from './site';
import type { BusinessInfo, HoursStatus, Media, Product } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function localBusinessLd(info: BusinessInfo | null, hours: HoursStatus | null) {
  if (!info) return null;
  const week = hours?.weeks?.REGULAR ?? [];
  const opening = week.flatMap((d) => d.ranges.map((r) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAYS[d.weekday]}`, opens: r.opens, closes: r.closes })));
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#negocio`,
    name: info.name,
    description: info.description,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/opengraph-image`,
    telephone: info.phone,
    email: info.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: info.address,
      addressLocality: info.city,
      addressRegion: info.province,
      postalCode: info.postalCode,
      addressCountry: info.country,
    },
    geo: info.lat && info.lng ? { '@type': 'GeoCoordinates', latitude: info.lat, longitude: info.lng } : undefined,
    areaServed: info.serviceArea?.map((a) => ({ '@type': 'City', name: a })),
    sameAs: [info.instagramUrl].filter(Boolean),
    openingHoursSpecification: opening.length ? opening : undefined,
    hasMap: info.mapsUrl,
    founder: info.owner ? { '@type': 'Person', name: info.owner } : undefined,
  };
}

export function productLd(p: Product, business: BusinessInfo | null) {
  const offers =
    p.priceTiers?.length || p.priceFrom
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'ARS',
          lowPrice: Math.min(...(p.priceTiers.length ? p.priceTiers.map((t) => t.price) : [p.priceFrom!])),
          highPrice: Math.max(...(p.priceTiers.length ? p.priceTiers.map((t) => t.price) : [p.priceFrom!])),
          offerCount: p.priceTiers.length || 1,
          availability: 'https://schema.org/InStock',
          seller: business ? { '@type': 'LocalBusiness', name: business.name, '@id': `${SITE_URL}/#negocio` } : undefined,
        }
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.summary ?? p.description ?? undefined,
    image: p.images.slice(0, 4).map((m) => absoluteMediaUrl(m.variants?.lg ?? m.path)),
    url: `${SITE_URL}/servicios/${p.slug}`,
    category: p.category?.name,
    brand: { '@type': 'Brand', name: 'Martino Gráfica' },
    material: p.materials?.join(', ') || undefined,
    offers,
  };
}

export function ogImage(m: Media | null | undefined) {
  return m ? [{ url: absoluteMediaUrl(m.variants?.lg ?? m.path), width: m.width ?? 1600, height: m.height ?? 1200 }] : undefined;
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
