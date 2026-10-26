import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Título de sección: rotulado expandido + bajada opcional, alineado a la izquierda */
export function SectionTitle({ title, lede, action, className, as: As = 'h2', id }: { title: ReactNode; lede?: ReactNode; action?: ReactNode; className?: string; as?: 'h1' | 'h2'; id?: string }) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:mb-12', className)}>
      <div className="min-w-0 max-w-3xl">
        <As id={id} className="display t-md">
          {title}
        </As>
        {lede && <p className="lede mt-4 opacity-75">{lede}</p>}
      </div>
      {action}
    </div>
  );
}
