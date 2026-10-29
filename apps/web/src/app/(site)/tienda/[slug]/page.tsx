import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ChevronRight, Clock, MapPin } from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';
import { BuyBox } from '@/components/store/buy-box';
import { ProductTile } from '@/components/store/product-tile';
import { Img } from '@/components/ui/img';
import { ViewPing } from '@/components/works/work-gallery';
import { getBusiness, getStoreProduct } from '@/lib/api';
import { money } from '@/lib/format';
import { absoluteMediaUrl } from '@/lib/media';
import { breadcrumbLd, ogImage } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getStoreProduct(slug);
  if (!p) return { title: 'Producto no encontrado' };
  const desc = `${p.name}${p.price != null ? ` a ${money(p.price)}` : ''}. ${p.category.name}${p.subcategory ? ` · ${p.subcategory}` : ''}. Pedilo online en Martino Gráfica, Villa Gesell.`;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/tienda/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: ogImage(p.image) },
  };
}

export default async function StoreProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, business] = await Promise.all([getStoreProduct(slug), getBusiness()]);
  if (!p) notFound();
  const info = business.info;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku ?? undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    image: p.image ? [absoluteMediaUrl(p.image.variants?.lg ?? p.image.path)] : undefined,
    category: p.category.name,
    url: `${SITE_URL}/tienda/${p.slug}`,
    offers:
      p.price != null
        ? {
            '@type': 'Offer',
            priceCurrency: 'ARS',
            price: p.price,
            availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: info ? { '@type': 'LocalBusiness', name: info.name, '@id': `${SITE_URL}/#negocio` } : undefined,
          }
        : undefined,
  };

  return (
    <article className="pb-16">
      <ViewPing path={`/store/products/${p.slug}`} />
      <JsonLd
        data={[
          ld,
          breadcrumbLd([
            { name: 'Inicio', path: '/' },
            { name: 'Tienda', path: '/tienda' },
            { name: p.category.name, path: `/tienda?categoria=${p.category.slug}` },
            { name: p.name, path: `/tienda/${p.slug}` },
          ]),
        ]}
      />

      <div className="container-x pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.25rem)] lg:pt-[calc(var(--header-h)+2.5rem)]">
        <nav aria-label="Ubicación" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-smoke">
          <Link href="/tienda" className="hover:text-white">
            Tienda
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/tienda?categoria=${p.category.slug}`} className="hover:text-white">
            {p.category.name}
          </Link>
          {p.subcategory && p.subcategory !== p.category.name && (
            <>
              <ChevronRight className="size-3.5" />
              <Link href={`/tienda?categoria=${p.category.slug}&sub=${encodeURIComponent(p.subcategory)}`} className="hover:text-white">
                {p.subcategory}
              </Link>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="reg text-white/70 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <span className="reg-b" />
            <div className="overflow-hidden rounded-[3px] bg-white">
              <Img media={p.image} alt={p.name} fit="contain" ratio="1/1" priority sizes="(min-width: 1024px) 45vw, 92vw" className="!bg-white" imgClassName="p-[7%]" />
            </div>
          </div>

          <div className="min-w-0">
            {p.brand && <p className="text-sm font-bold uppercase tracking-wide text-smoke">{p.brand}</p>}
            <h1 className="display mt-1 text-[clamp(1.9rem,5vw,3.1rem)]">{p.name}</h1>
            {p.sku && <p className="tabular mt-3 text-sm text-smoke">Código {p.sku}</p>}

            <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-2 border-y border-white/10 py-5">
              {p.price != null ? (
                <p className="tabular display text-[clamp(2.2rem,6vw,3.2rem)] text-lime">{money(p.price)}</p>
              ) : (
                <p className="display t-sm">Precio a consultar</p>
              )}
              <p className="pb-1.5 text-sm text-smoke">{p.unit !== 'unidad' ? `Por ${p.unit}` : 'Precio final por unidad'}</p>
              <p className={`ml-auto inline-flex items-center gap-1.5 pb-1.5 text-sm font-bold ${p.inStock ? 'text-ok' : 'text-warn'}`}>
                {p.inStock ? <Check className="size-4" strokeWidth={3} /> : <Clock className="size-4" />}
                {p.inStock ? 'Disponible' : 'Sin stock por ahora'}
              </p>
            </div>

            <div className="mt-6">
              <BuyBox product={p} />
            </div>

            {p.description && <div className="prose-mg mt-8 whitespace-pre-line text-white/80">{p.description}</div>}

            <ul className="mt-8 space-y-3 rounded-md bg-graphite p-5 text-[0.95rem] text-white/80 ring-1 ring-white/8">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-lime" />
                <span>
                  Retiro en el taller{info?.address ? `: ${info.address}, ${info.city}` : ''}. Si necesitás envío, lo coordinamos por WhatsApp.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-lime" />
                <span>Al finalizar, te confirmamos stock, precio final y forma de pago antes de preparar el pedido.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {p.related.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="relacionados">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="relacionados" className="display t-sm">
              Más de {p.category.name.toLowerCase()}
            </h2>
            <Link href={`/tienda?categoria=${p.category.slug}`} className="text-sm font-bold text-lime underline-offset-4 hover:underline">
              Ver toda la categoría
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {p.related.map((r) => (
              <li key={r.id} className="flex">
                <ProductTile product={r} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
