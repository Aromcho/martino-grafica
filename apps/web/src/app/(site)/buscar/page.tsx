import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductTile } from '@/components/store/product-tile';
import { Img } from '@/components/ui/img';
import { PageHeader } from '@/components/ui/page-header';
import { SearchForm } from '@/components/site/search-form';
import { search } from '@/lib/api';
import { formatDate, plural } from '@/lib/format';

type SP = Promise<{ q?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Buscar: ${q}` : 'Buscar', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const r = q.length > 1 ? await search(q) : null;
  const store = r?.store ?? [];
  const total = r ? store.length + r.products.length + r.works.length + r.categories.length : 0;
  return (
    <>
      <PageHeader title="Buscar" lede={r ? (total ? `${plural(total, 'resultado', 'resultados')} para «${q}».` : `No encontramos nada para «${q}».`) : 'Buscá productos de la tienda, trabajos, servicios o materiales.'}>
        <SearchForm initial={q} />
      </PageHeader>
      <div className="container-x space-y-16 pb-24">
        {store.length > 0 && (
          <section aria-labelledby="r-store">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 id="r-store" className="text-lg font-bold">
                En la tienda
              </h2>
              <Link href={`/tienda?q=${encodeURIComponent(q)}`} className="text-sm font-bold text-lime underline-offset-4 hover:underline">
                Ver todos en la tienda
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
              {store.map((p) => (
                <li key={p.id} className="flex">
                  <ProductTile product={p} className="w-full" />
                </li>
              ))}
            </ul>
          </section>
        )}
        {r && r.categories.length > 0 && (
          <section aria-labelledby="r-cat">
            <h2 id="r-cat" className="mb-5 text-lg font-bold">
              Rubros
            </h2>
            <ul className="flex flex-wrap gap-2">
              {r.categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/trabajos?rubro=${c.slug}`} className="chip">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {r && r.products.length > 0 && (
          <section aria-labelledby="r-prod">
            <h2 id="r-prod" className="mb-6 text-lg font-bold">
              Servicios
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
              {r.products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {r && r.works.length > 0 && (
          <section aria-labelledby="r-works">
            <h2 id="r-works" className="mb-6 text-lg font-bold">
              Trabajos
            </h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-9 px-[10px] sm:gap-x-8 lg:grid-cols-4">
              {r.works.map((w) => (
                <li key={w.id}>
                  <Link href={`/trabajos/${w.slug}`} className="group block">
                    <div className="reg reg-sm text-white/70 transition-colors group-hover:text-lime">
                      <div className="peel overflow-hidden rounded-[3px]">
                        <Img media={w.cover} alt={w.title} ratio="4/5" sizes="(min-width: 1024px) 22vw, 46vw" />
                      </div>
                      <span className="reg-b" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-[0.92rem] font-bold leading-snug">{w.title}</h3>
                    <p className="mt-1 text-[0.8rem] text-smoke">{[w.category.name, w.location, w.doneAt ? formatDate(w.doneAt, { year: 'numeric' }) : ''].filter(Boolean).join(', ')}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {r && total === 0 && (
          <div className="liner rounded-md px-6 py-12 text-center">
            <p className="display t-sm">Probá con otra palabra</p>
            <p className="mx-auto mt-3 max-w-md text-slate">Por ejemplo: camioneta, neón, esmerilado, remeras o el nombre de una localidad. O consultanos directamente.</p>
            <Link href="/cotizar" className="mt-6 inline-flex h-12 items-center rounded-lg bg-ink px-5 font-bold text-white">
              Pedir presupuesto
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
