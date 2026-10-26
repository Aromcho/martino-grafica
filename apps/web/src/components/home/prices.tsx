import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { TierTable } from '@/components/catalog/tier-table';
import type { Product } from '@/lib/types';

/** Precios publicados (sólo los que el taller publicó): sobre el liner, como etiquetas recortadas */
export function Prices({ products }: { products: Product[] }) {
  const list = products.filter((p) => p.priceTiers.length > 0);
  if (!list.length) return null;
  return (
    <section className="liner py-20 lg:py-28" style={{ ['--cm' as string]: '22px' }} aria-labelledby="precios-title">
      <div className="container-x">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
          <div className="max-w-2xl">
            <h2 id="precios-title" className="display t-md">
              Remeras y gorras con tu logo
            </h2>
            <p className="lede mt-4 text-slate">Cuantas más pedís, menos pagás cada una. Precios por unidad publicados por el taller.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {list.map((p) => (
            <article key={p.id} className="relative rounded-md bg-white p-6 shadow-[0_1px_0_rgb(0_0_0/0.06),0_18px_40px_-28px_rgb(0_0_0/0.45)] ring-1 ring-black/5 lg:p-8">
              <span className="absolute -top-px right-6 h-2 w-14 rounded-b bg-lime" aria-hidden="true" />
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="display text-[1.7rem]">{p.name.replace(' personalizada', '')}</h3>
                {p.leadTime && <span className="text-sm font-semibold text-slate">Producción {p.leadTime}</span>}
              </div>
              <TierTable tiers={p.priceTiers} caption={`Precio por unidad según cantidad: ${p.name}`} unit={p.unit} className="mt-6" />
              {p.priceNote && <p className="mt-4 text-sm text-slate">{p.priceNote}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/cotizar?servicio=${p.slug}`} className={buttonClass('ink', 'md')}>
                  Calcular mi pedido
                </Link>
                <Link href={`/servicios/${p.slug}`} className={buttonClass('outline', 'md', 'text-ink')}>
                  Ver detalles
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
