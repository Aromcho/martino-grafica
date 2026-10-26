import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Encabezado de páginas internas: título rotulado grande y una línea de corte magenta
 * que lo separa del contenido, como la regla del plotter.
 */
export function PageHeader({
  title,
  lede,
  back,
  aside,
  className,
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  back?: { href: string; label: string };
  aside?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn('container-x pb-8 pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.75rem)] lg:pb-12 lg:pt-[calc(var(--header-h)+3.5rem)]', className)}>
      {back && (
        <Link href={back.href} className="-ml-1.5 mb-5 inline-flex items-center gap-1 rounded-md py-1 pl-0.5 pr-2 text-sm font-semibold text-smoke transition-colors hover:text-white">
          <ChevronLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0 max-w-4xl">
          <h1 className="display t-lg">{title}</h1>
          {lede && <p className="lede mt-5 text-white/75">{lede}</p>}
        </div>
        {aside}
      </div>
      {children}
    </header>
  );
}
