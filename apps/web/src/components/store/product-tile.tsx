'use client';

import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { StoreCard } from '@/lib/types';
import { useCart } from './cart';

/** Producto de la tienda: foto sobre blanco (como sale del rollo), nombre, precio y agregar al carrito de un toque */
export function ProductTile({ product, className, priority }: { product: StoreCard; className?: string; priority?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const p = product;
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <Link href={`/tienda/${p.slug}`} className="peel relative block overflow-hidden rounded-[3px] bg-white" aria-label={p.name}>
        <Img
          media={p.image}
          alt={p.name}
          fit="contain"
          ratio="1/1"
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 30vw, 46vw"
          priority={priority}
          className="!bg-white"
          imgClassName="p-[6%] transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {!p.image && <span className="absolute inset-0 grid place-items-center px-4 text-center text-xs font-semibold text-slate">Foto a confirmar</span>}
        {!p.inStock && <span className="absolute left-2 top-2 rounded bg-ink px-2 py-1 text-[0.7rem] font-bold text-white">Sin stock</span>}
        {p.featured && p.inStock && <span className="absolute left-2 top-2 rounded bg-lime px-2 py-1 text-[0.7rem] font-extrabold text-ink">Destacado</span>}
      </Link>
      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        {(p.subcategory || p.brand) && <p className="truncate text-[0.72rem] font-semibold uppercase tracking-wide text-smoke">{[p.brand, p.subcategory].filter(Boolean).join(' · ')}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-[0.95rem] font-semibold leading-snug sm:text-[1rem]">
          <Link href={`/tienda/${p.slug}`} className="transition-colors hover:text-lime">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="tabular min-w-0 leading-tight">
            {p.price != null ? (
              <span className="text-[1.15rem] font-extrabold sm:text-[1.25rem]">{money(p.price)}</span>
            ) : (
              <span className="text-sm font-semibold text-smoke">Consultar precio</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              add(p, 1);
              setAdded(true);
              window.setTimeout(() => setAdded(false), 1400);
            }}
            className={cn('grid size-10 shrink-0 place-items-center rounded-lg transition-colors', added ? 'bg-white text-ink' : 'bg-lime text-ink hover:bg-white')}
            aria-label={`Agregar ${p.name} al carrito`}
          >
            {added ? <Check className="size-5" strokeWidth={3} /> : <Plus className="size-5" strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </article>
  );
}
