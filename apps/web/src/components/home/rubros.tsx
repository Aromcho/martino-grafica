import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Img } from '@/components/ui/img';
import type { Category } from '@/lib/types';

/** Rubros como renglones de un muestrario: nombre grande, bajada y la foto del trabajo más reciente */
export function Rubros({ categories }: { categories: Category[] }) {
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="rubros-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
        <h2 id="rubros-title" className="display t-md max-w-[16ch]">
          Lo que sale del taller
        </h2>
        <p className="max-w-sm text-smoke">Cada rubro lleva a sus trabajos reales, con fotos de cómo quedaron.</p>
      </div>
      <ul className="border-t border-white/12">
        {categories.map((c) => (
          <li key={c.slug} className="border-b border-white/12">
            <Link href={`/trabajos?rubro=${c.slug}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_7.5rem_auto] lg:py-7">
              <span className="display text-[clamp(1.55rem,6.2vw,3.4rem)] transition-colors group-hover:text-lime">{c.name}</span>
              <Img media={c.cover} sizes="120px" className="row-span-2 aspect-square w-20 shrink-0 rounded-[3px] lg:row-span-1 lg:order-3 lg:w-[7.5rem]" />
              <span className="text-[0.95rem] text-smoke lg:order-2">{c.tagline}</span>
              <span className="tabular hidden items-center gap-2 text-sm font-semibold text-white/80 lg:order-4 lg:flex">
                {c.workCount} trabajos <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
