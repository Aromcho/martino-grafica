import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ChevronLeft, Clock, Ruler } from 'lucide-react';
import { ProductCard } from '@/components/catalog/product-card';
import { TierCalculator } from '@/components/catalog/tier-calculator';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { Img } from '@/components/ui/img';
import { ViewPing, WorkGallery } from '@/components/works/work-gallery';
import { getBusiness, getProduct, getSitemap } from '@/lib/api';
import { formatDate, priceLine, waLink } from '@/lib/format';
import { breadcrumbLd, ogImage, productLd } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { products } = await getSitemap();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Servicio no encontrado' };
  const desc = `${p.summary ?? p.name}. ${priceLine(p)}. Martino Gráfica, Villa Gesell.`;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/servicios/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: ogImage(p.cover ?? p.images[0]) },
  };
}

const MODE_HINT = {
  AREA: 'Se cotiza según la medida (ancho × alto), el material y la terminación.',
  UNITS: 'Se cotiza según la cantidad y el tamaño.',
  CUSTOM: 'Cada trabajo se cotiza aparte: mandanos fotos o medidas y te pasamos el precio.',
} as const;

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, business] = await Promise.all([getProduct(slug), getBusiness()]);
  if (!p) notFound();
  const info = business.info;
  const images = p.images.length ? p.images : p.cover ? [p.cover] : [];
  const waText = `Hola! Quiero consultar por "${p.name}" que vi en la web.`;
  const specs = Object.entries(p.specs ?? {});

  return (
    <article className="pb-16">
      <ViewPing path={`/products/${p.slug}`} />
      <JsonLd
        data={[
          productLd(p, info),
          breadcrumbLd([
            { name: 'Inicio', path: '/' },
            { name: 'Servicios', path: '/servicios' },
            { name: p.category.name, path: `/servicios#${p.category.slug}` },
            { name: p.name, path: `/servicios/${p.slug}` },
          ]),
        ]}
      />

      <header className="container-x pb-8 pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.5rem)] lg:pb-10 lg:pt-[calc(var(--header-h)+3rem)]">
        <Link href={`/servicios#${p.category.slug}`} className="-ml-1.5 mb-5 inline-flex items-center gap-1 rounded-md py-1 pl-0.5 pr-2 text-sm font-semibold text-smoke transition-colors hover:text-white">
          <ChevronLeft className="size-4" /> {p.category.name}
        </Link>
        <h1 className="display max-w-[20ch] text-[clamp(2.1rem,7.4vw,4.5rem)]">{p.name}</h1>
        {p.summary && <p className="lede mt-5 text-white/80">{p.summary}</p>}
      </header>

      <div className="lg:container-x lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <WorkGallery images={images} title={p.name} />
        </div>

        <div className="container-x mt-10 lg:col-span-5 lg:mt-0 lg:px-0">
          <div className="space-y-8 lg:sticky lg:top-[calc(var(--header-offset,0px)+1.5rem)] lg:transition-[top] lg:duration-300">
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-white/12 py-5 text-[0.95rem]">
              <p className="font-bold">{priceLine(p)}</p>
              {p.leadTime && (
                <p className="inline-flex items-center gap-1.5 text-smoke">
                  <Clock className="size-4" aria-hidden="true" /> {p.leadTime}
                </p>
              )}
              {p.quoteMode === 'AREA' && (
                <p className="inline-flex items-center gap-1.5 text-smoke">
                  <Ruler className="size-4" aria-hidden="true" /> A medida
                </p>
              )}
            </div>

            {p.priceTiers.length > 0 ? (
              <TierCalculator slug={p.slug} name={p.name} tiers={p.priceTiers} unit={p.unit} note={p.priceNote} minQty={p.minQty} />
            ) : (
              <div className="rounded-md bg-graphite p-5 ring-1 ring-white/10">
                <p className="text-lg font-bold">Pedí tu presupuesto</p>
                <p className="mt-1 text-smoke">{MODE_HINT[p.quoteMode]}</p>
                {p.priceNote && <p className="mt-2 text-sm text-smoke">{p.priceNote}</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/cotizar?servicio=${p.slug}`} className={buttonClass('lime', 'md')}>
                    Cotizar {p.quoteMode === 'AREA' ? 'con mi medida' : 'ahora'}
                  </Link>
                  {info?.whatsapp && (
                    <a href={waLink(info.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md', 'text-white')}>
                      <WhatsAppIcon className="size-5" /> Consultar
                    </a>
                  )}
                </div>
              </div>
            )}

            {p.features.length > 0 && (
              <ul className="space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            {(p.materials.length > 0 || p.finishes.length > 0 || p.sizes.length > 0) && (
              <dl className="space-y-5">
                {[
                  { k: 'Materiales', v: p.materials },
                  { k: 'Terminaciones', v: p.finishes },
                  { k: p.unit === 'unidad' && p.sizes.every((s) => !s.width) ? 'Talles y medidas' : 'Medidas', v: p.sizes.map((s) => s.label) },
                ]
                  .filter((g) => g.v.length > 0)
                  .map((g) => (
                    <div key={g.k}>
                      <dt className="text-sm text-smoke">{g.k}</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {g.v.map((x) => (
                          <span key={x} className="rounded-md bg-white/8 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/12">
                            {x}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}

            {specs.length > 0 && (
              <dl className="divide-y divide-white/10 border-y border-white/10">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-2.5 text-[0.95rem]">
                    <dt className="text-smoke">{k}</dt>
                    <dd className="text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {p.description && (
              <div className="prose-mg leading-relaxed text-white/80">
                {p.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {p.relatedWorks.length > 0 && (
        <section className="container-x mt-20 lg:mt-28" aria-labelledby="works-title">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="works-title" className="display t-sm">
              Trabajos hechos
            </h2>
            <Link href={`/trabajos?rubro=${p.category.slug}`} className="text-sm font-semibold underline-offset-4 hover:underline">
              Ver todos los de {p.category.name.toLowerCase()}
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-9 px-[10px] sm:gap-x-8 lg:grid-cols-4">
            {p.relatedWorks.slice(0, 8).map((w) => (
              <li key={w.id}>
                <Link href={`/trabajos/${w.slug}`} className="group block">
                  <div className="reg reg-sm text-white/70 transition-colors group-hover:text-lime">
                    <div className="peel overflow-hidden rounded-[3px]">
                      <Img media={w.cover} alt={w.title} ratio="4/5" sizes="(min-width: 1024px) 22vw, 46vw" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <span className="reg-b" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-[0.9rem] font-bold leading-snug sm:text-[0.98rem]">{w.title}</h3>
                  <p className="mt-1 text-[0.8rem] text-smoke sm:text-sm">{[w.location, w.doneAt ? formatDate(w.doneAt, { year: 'numeric' }) : ''].filter(Boolean).join(', ')}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.siblings.length > 0 && (
        <section className="container-x mt-20 border-t border-white/12 pt-14 lg:mt-28" aria-labelledby="siblings-title">
          <h2 id="siblings-title" className="display t-sm mb-8">
            Más de {p.category.name.toLowerCase()}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            {p.siblings.slice(0, 3).map((s) => (
              <li key={s.id}>
                <ProductCard product={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
