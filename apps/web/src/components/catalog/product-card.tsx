import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { priceLine } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * Servicio del catálogo. En el celular es un renglón (foto chica + texto) para recorrer rápido;
 * desde tablet pasa a tarjeta con la foto arriba.
 */
type CardProduct = Pick<Product, 'slug' | 'name' | 'summary' | 'priceFrom' | 'cover'> & Partial<Pick<Product, 'images' | 'priceTiers' | 'unit' | 'quoteMode' | 'leadTime'>>;

export function ProductCard({ product }: { product: CardProduct }) {
  const p = { images: [], priceTiers: [], unit: 'unidad', quoteMode: 'CUSTOM' as const, leadTime: null, ...product };
  const cover = p.cover ?? p.images[0] ?? null;
  return (
    <Link href={`/servicios/${p.slug}`} className="group grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 outline-none sm:block">
      <div className="peel overflow-hidden rounded-[3px]">
        <Img media={cover} alt={p.name} sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 104px" ratio="1/1" className="sm:!aspect-[4/3]" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
      </div>
      <div className="min-w-0 sm:mt-4">
        <h3 className="text-[1.05rem] font-bold leading-snug transition-colors group-hover:text-lime sm:text-lg">{p.name}</h3>
        {p.summary && <p className="mt-1 line-clamp-2 text-[0.92rem] text-smoke sm:line-clamp-3">{p.summary}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-bold text-white">{priceLine(p)}</span>
          {p.leadTime && p.leadTime !== 'Según el trabajo' && (
            <span className="inline-flex items-center gap-1 text-smoke">
              <Clock className="size-3.5" aria-hidden="true" /> {p.leadTime}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
