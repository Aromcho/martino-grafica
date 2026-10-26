import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { PriceTier } from '@/lib/types';

/** Escalas de precio por cantidad, como una etiqueta de precios del taller */
export function TierTable({ tiers, caption, unit = 'unidad', highlight, className }: { tiers: PriceTier[]; caption: string; unit?: string; highlight?: number; className?: string }) {
  return (
    <table className={cn('tabular w-full text-left', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-sm text-slate">
          <th scope="col" className="pb-2 font-semibold">
            Cantidad
          </th>
          <th scope="col" className="pb-2 text-right font-semibold">
            Precio por {unit}
          </th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t) => {
          const on = highlight === t.minQty;
          return (
            <tr key={t.minQty} className={cn('border-t border-dashed border-black/15 transition-colors', on && 'bg-lime/45')}>
              <td className="py-2.5 pl-1 text-[1.05rem] font-semibold">{t.minQty === 1 ? `1 ${unit}` : `${t.minQty} o más`}</td>
              <td className="py-2.5 pr-1 text-right text-[1.25rem] font-extrabold">{t.label?.includes('desde') ? `desde ${money(t.price)}` : money(t.price)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
