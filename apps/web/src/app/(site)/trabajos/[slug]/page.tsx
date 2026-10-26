import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonClass } from '@/components/ui/button';
import { InstagramIcon, WhatsAppIcon } from '@/components/ui/icons';
import { ViewPing, WorkGallery } from '@/components/works/work-gallery';
import { WorkCard } from '@/components/works/work-card';
import { getBusiness, getSitemap, getWork } from '@/lib/api';
import { money, monthYear, waLink } from '@/lib/format';
import { absoluteMediaUrl } from '@/lib/media';
import { breadcrumbLd, ogImage } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { works } = await getSitemap();
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const w = await getWork(slug);
  if (!w) return { title: 'Trabajo no encontrado' };
  const desc = w.summary ?? `${w.title}. ${w.category.name} por Martino Gráfica${w.location ? ` en ${w.location}` : ''}.`;
  return {
    title: w.title,
    description: desc,
    alternates: { canonical: `/trabajos/${w.slug}` },
    openGraph: { title: w.title, description: desc, images: ogImage(w.cover ?? w.images[0]), type: 'article' },
  };
}

export default async function WorkPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [w, business] = await Promise.all([getWork(slug), getBusiness()]);
  if (!w) notFound();
  const info = business.info;
  const images = w.images.length ? w.images : w.cover ? [w.cover] : [];
  const when = monthYear(w.doneAt);
  const quoteHref = `/cotizar?${new URLSearchParams({ ...(w.product ? { servicio: w.product.slug } : {}), trabajo: w.slug })}`;
  const waText = `Hola! Vi el trabajo "${w.title}" en la web y quiero consultar por algo parecido.`;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: w.title,
      description: w.summary ?? undefined,
      url: `${SITE_URL}/trabajos/${w.slug}`,
      image: images.slice(0, 6).map((m) => absoluteMediaUrl(m.variants?.lg ?? m.path)),
      dateCreated: w.doneAt ?? undefined,
      genre: w.category.name,
      locationCreated: w.location ? { '@type': 'Place', name: w.location } : undefined,
      creator: { '@type': 'LocalBusiness', '@id': `${SITE_URL}/#negocio`, name: info?.name ?? 'Martino Gráfica' },
      material: w.materials.length ? w.materials.join(', ') : undefined,
    },
    breadcrumbLd([
      { name: 'Inicio', path: '/' },
      { name: 'Trabajos', path: '/trabajos' },
      { name: w.category.name, path: `/trabajos?rubro=${w.category.slug}` },
      { name: w.title, path: `/trabajos/${w.slug}` },
    ]),
  ];

  const facts = [
    { k: 'Rubro', v: w.category.name, href: `/trabajos?rubro=${w.category.slug}` },
    w.client ? { k: 'Cliente', v: w.client } : null,
    w.location ? { k: 'Lugar', v: w.location, href: `/trabajos?zona=${encodeURIComponent(w.location)}` } : null,
    when ? { k: 'Fecha', v: when[0].toUpperCase() + when.slice(1) } : null,
  ].filter(Boolean) as { k: string; v: string; href?: string }[];

  return (
    <article className="pb-16">
      <ViewPing path={`/works/${w.slug}`} />
      <JsonLd data={ld} />

      <header className="container-x pb-8 pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.5rem)] lg:pb-10 lg:pt-[calc(var(--header-h)+3rem)]">
        <Link href={`/trabajos?rubro=${w.category.slug}`} className="-ml-1.5 mb-5 inline-flex items-center gap-1 rounded-md py-1 pl-0.5 pr-2 text-sm font-semibold text-smoke transition-colors hover:text-white">
          <ChevronLeft className="size-4" /> {w.category.name}
        </Link>
        <h1 className="display max-w-[22ch] text-[clamp(2rem,7vw,4.25rem)]">{w.title}</h1>
      </header>

      <div className="lg:container-x lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <WorkGallery images={images} title={w.title} />
        </div>

        <div className="container-x mt-10 lg:col-span-5 lg:mt-0 lg:px-0">
          <div className="lg:sticky lg:top-[calc(var(--header-offset,0px)+1.5rem)] lg:transition-[top] lg:duration-300">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-white/12 py-6">
              {facts.map((f) => (
                <div key={f.k} className="min-w-0">
                  <dt className="text-sm text-smoke">{f.k}</dt>
                  <dd className="mt-1 font-bold">
                    {f.href ? (
                      <Link href={f.href} className="underline-offset-4 hover:text-lime hover:underline">
                        {f.v}
                      </Link>
                    ) : (
                      f.v
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {(w.summary || w.description) && (
              <div className="prose-mg mt-7 text-[1.05rem] leading-relaxed text-white/85">
                {w.summary && <p className="text-lg font-semibold text-white">{w.summary}</p>}
                {w.description?.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}

            {w.materials.length > 0 && (
              <div className="mt-7">
                <h2 className="text-sm text-smoke">Materiales y terminaciones</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {w.materials.map((m) => (
                    <li key={m} className="rounded-md bg-white/8 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/12">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-9 rounded-md bg-graphite p-5 ring-1 ring-white/10">
              <p className="text-lg font-bold">¿Querés uno así?</p>
              <p className="mt-1 text-smoke">Contanos la medida y te pasamos el presupuesto por WhatsApp.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={quoteHref} className={buttonClass('lime', 'md')}>
                  Pedí uno así
                </Link>
                {info?.whatsapp && (
                  <a href={waLink(info.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md', 'text-white')}>
                    <WhatsAppIcon className="size-5" /> Consultar
                  </a>
                )}
              </div>
              {w.product && (
                <Link href={`/servicios/${w.product.slug}`} className="group mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm">
                  <span>
                    <span className="text-smoke">Servicio: </span>
                    <span className="font-bold group-hover:text-lime">{w.product.name}</span>
                    {w.product.priceFrom ? <span className="text-smoke">, desde {money(w.product.priceFrom)}</span> : null}
                  </span>
                  <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>

            {w.instagramCode && (
              <a
                href={`https://www.instagram.com/p/${w.instagramCode}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-smoke underline-offset-4 hover:text-white hover:underline"
              >
                <InstagramIcon className="size-4" /> Ver la publicación en Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      {(w.prev || w.next) && (
        <nav className="container-x mt-16 grid grid-cols-2 gap-4 border-y border-white/12 py-6 lg:mt-24" aria-label="Otros trabajos">
          {w.prev ? (
            <Link href={`/trabajos/${w.prev.slug}`} className="group min-w-0">
              <span className="flex items-center gap-1.5 text-sm text-smoke">
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Anterior
              </span>
              <span className="mt-1 line-clamp-2 font-bold group-hover:text-lime">{w.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {w.next && (
            <Link href={`/trabajos/${w.next.slug}`} className="group min-w-0 text-right">
              <span className="flex items-center justify-end gap-1.5 text-sm text-smoke">
                Siguiente <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 line-clamp-2 font-bold group-hover:text-lime">{w.next.title}</span>
            </Link>
          )}
        </nav>
      )}

      {w.related.length > 0 && (
        <section className="container-x mt-16 lg:mt-20" aria-labelledby="related-title">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="related-title" className="display t-sm">
              Más de {w.category.name.toLowerCase()}
            </h2>
            <Link href={`/trabajos?rubro=${w.category.slug}`} className="text-sm font-semibold underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-9 px-[10px] sm:gap-x-8 lg:grid-cols-4">
            {w.related.slice(0, 4).map((r) => (
              <li key={r.id}>
                <WorkCard work={r} compact sizes="(min-width: 1024px) 22vw, 46vw" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
