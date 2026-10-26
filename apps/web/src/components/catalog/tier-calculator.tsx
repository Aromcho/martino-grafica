'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { money, tierFor } from '@/lib/format';
import type { PriceTier } from '@/lib/types';
import { TierTable } from './tier-table';

/** Calculadora con las escalas publicadas: elegís la cantidad y ves el precio por unidad y el total */
export function TierCalculator({ slug, name, tiers, unit, note, minQty = 1 }: { slug: string; name: string; tiers: PriceTier[]; unit: string; note?: string | null; minQty?: number }) {
  const [qty, setQty] = useState(Math.max(minQty, tiers[0]?.minQty ?? 1));
  const tier = tierFor(tiers, qty);
  const total = tier ? tier.price * qty : 0;
  const next = [...tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty);
  const set = (n: number) => setQty(Math.max(minQty, Math.min(10000, Math.round(n) || minQty)));
  const plural = unit === 'unidad' ? 'unidades' : `${unit}s`;

  return (
    <div className="liner rounded-md p-5 sm:p-6" style={{ ['--cm' as string]: '18px' }}>
      <TierTable tiers={tiers} caption={`Precio por ${unit} según cantidad: ${name}`} unit={unit} highlight={tier?.minQty} />
      <div className="mt-6 rounded-md bg-white p-4 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.45)] ring-1 ring-black/5">
        <label htmlFor={`qty-${slug}`} className="text-sm font-semibold text-slate">
          ¿Cuántas necesitás?
        </label>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-12 items-center rounded-lg ring-1 ring-black/15">
            <button type="button" onClick={() => set(qty - 1)} className="grid size-12 place-items-center text-ink disabled:opacity-30" disabled={qty <= minQty} aria-label="Una menos">
              <Minus className="size-4" />
            </button>
            <input
              id={`qty-${slug}`}
              type="number"
              inputMode="numeric"
              min={minQty}
              max={10000}
              value={qty}
              onChange={(e) => set(Number(e.target.value))}
              className="tabular h-full w-16 bg-transparent text-center text-lg font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="button" onClick={() => set(qty + 1)} className="grid size-12 place-items-center text-ink" aria-label="Una más">
              <Plus className="size-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-right text-ink" aria-live="polite">
            <p className="tabular text-sm text-slate">
              {tier?.label?.includes('desde') ? 'desde ' : ''}{money(tier?.price)} c/u
            </p>
            <p className="tabular text-2xl font-extrabold">{money(total)}</p>
          </div>
        </div>
        {next && (
          <p className="mt-3 text-sm text-slate">
            Llevando {next.minQty} pagás {money(next.price)} cada una.{' '}
            <button type="button" onClick={() => set(next.minQty)} className="font-bold text-ink underline underline-offset-2">
              Cambiar a {next.minQty}
            </button>
          </p>
        )}
        <Link href={`/cotizar?servicio=${slug}&cantidad=${qty}`} className={buttonClass('ink', 'md', 'mt-4 w-full')}>
          Pedir {qty} {qty === 1 ? unit : plural}
        </Link>
      </div>
      {note && <p className="mt-4 text-sm text-slate">{note}</p>}
    </div>
  );
}
