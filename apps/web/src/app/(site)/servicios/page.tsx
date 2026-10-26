import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ProductCard } from '@/components/catalog/product-card';
import { CategoryIndex } from '@/components/catalog/category-index';
import { BannerStrip } from '@/components/home/banner-strip';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonClass } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { getBanners, getCategories, getProducts } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Servicios',
  description:
    'Ploteo y rotulación de vehículos, motos, carteles luminosos y de lona, letras corpóreas, neón LED, vidrieras, esmerilados, calcos, remeras y gorras estampadas en Villa Gesell.',
  alternates: { canonical: '/servicios' },
};

export default async function ServicesPage() {
  const [categories, products, banners] = await Promise.all([getCategories(), getProducts(), getBanners('SERVICES')]);
  const groups = categories.map((c) => ({ c, items: products.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length > 0);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Servicios de Martino Gráfica',
    url: `${SITE_URL}/servicios`,
    itemListElement: groups.map((g) => ({
      '@type': 'OfferCatalog',
      name: g.c.name,
      itemListElement: g.items.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: p.name, url: `${SITE_URL}/servicios/${p.slug}` } })),
    })),
  };

  return (
    <>
      <JsonLd data={ld} />
      <PageHeader
        title="Servicios"
        lede={`${products.length} servicios en ${groups.length} rubros. Diseñamos, imprimimos, cortamos y colocamos en el taller. Donde hay precio publicado lo ves acá; el resto lo cotizamos según la medida.`}
      />
      <CategoryIndex items={groups.map((g) => ({ slug: g.c.slug, label: g.c.shortName ?? g.c.name }))} />

      <div className="container-x">
        {groups.map(({ c, items }, gi) => (
          <section key={c.id} id={c.slug} className="scroll-mt-[calc(var(--header-h)+4.5rem)] border-b border-white/12 py-14 last:border-b-0 lg:py-20" aria-labelledby={`cat-${c.slug}`}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-14">
              <div className="lg:sticky lg:top-[calc(var(--header-offset,0px)+5.5rem)] lg:self-start lg:transition-[top] lg:duration-300">
                <h2 id={`cat-${c.slug}`} className="display t-md">
                  {c.name}
                </h2>
                {c.description && <p className="mt-4 max-w-md text-white/75">{c.description}</p>}
                {c.materials.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Materiales">
                    {c.materials.map((m) => (
                      <li key={m} className="rounded bg-white/7 px-2 py-1 text-[0.8rem] font-semibold text-white/80 ring-1 ring-white/10">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
                {c.workCount > 0 && (
                  <Link href={`/trabajos?rubro=${c.slug}`} className="group mt-6 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:text-lime hover:underline">
                    Ver {c.workCount} trabajos de {c.name.toLowerCase()} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
              <ul className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 xl:grid-cols-3">
                {items.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </div>
            {gi === 1 && banners.length > 0 && (
              <div className="mt-14">
                <BannerStrip banners={banners} bare />
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="liner py-16 lg:py-24" style={{ ['--cm' as string]: '22px' }}>
        <div className="container-x flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="display t-md">¿No está en la lista?</h2>
            <p className="lede mt-4 text-slate">Si se imprime, se corta o se pega, seguro lo hacemos. Contanos qué necesitás y te pasamos presupuesto.</p>
          </div>
          <Link href="/cotizar" className={buttonClass('ink', 'lg')}>
            Pedir presupuesto
          </Link>
        </div>
      </section>
    </>
  );
}
