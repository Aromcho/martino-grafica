import Link from 'next/link';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { WorkCard as Work } from '@/lib/types';

/** Tarjeta de trabajo: foto con marcas de registro y la esquina que se despega al pasar */
export function WorkCard({
  work,
  priority,
  className,
  sizes = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw',
  ratio = '4/5',
  compact,
}: {
  work: Work;
  priority?: boolean;
  className?: string;
  sizes?: string;
  ratio?: string;
  /** versión densa para la grilla del portfolio (dos columnas en el celular) */
  compact?: boolean;
}) {
  const year = work.doneAt ? formatDate(work.doneAt, { year: 'numeric' }) : '';
  const meta = compact
    ? [work.location, year].filter(Boolean).join(', ')
    : [work.category?.shortName ?? work.category?.name, work.location, year].filter(Boolean).join(', ');
  return (
    <Link href={`/trabajos/${work.slug}`} className={cn('group block outline-none', className)}>
      <div className={cn('reg text-white/70 transition-colors group-hover:text-lime', compact && 'reg-sm')}>
        <div className="peel overflow-hidden rounded-[3px]">
          <Img media={work.cover} alt={work.title} sizes={sizes} priority={priority} ratio={ratio} imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        </div>
        <span className="reg-b" aria-hidden="true" />
      </div>
      <div className={cn('flex items-start justify-between gap-3', compact ? 'mt-3' : 'mt-4')}>
        <div className="min-w-0">
          <h3 className={cn('font-bold leading-snug text-white', compact ? 'line-clamp-2 text-[0.9rem] sm:text-[0.98rem]' : 'text-[1.02rem]')}>{work.title}</h3>
          <p className={cn('mt-1 text-smoke', compact ? 'text-[0.8rem] sm:text-sm' : 'text-sm')}>{meta}</p>
        </div>
        {!compact && work.imageCount > 1 && (
          <span className="tabular shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-smoke ring-1 ring-white/15">{work.imageCount} fotos</span>
        )}
      </div>
    </Link>
  );
}
