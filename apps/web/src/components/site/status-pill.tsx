'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { statusText, useBusiness } from './business-provider';

const COLORS = { open: '#C6F800', soon: '#f5a524', closed: '#ec008c', unknown: '#9ba0a6' } as const;

/** Estado del taller con un LED: lima abierto, ámbar cierra pronto, magenta cerrado */
export function StatusPill({ className, detailed, href = '/contacto#horarios' }: { className?: string; detailed?: boolean; href?: string }) {
  const { hours } = useBusiness();
  const s = statusText(hours);
  return (
    <Link
      href={href}
      className={cn('inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-white/8 pl-2.5 pr-3 text-[0.8rem] font-semibold ring-1 ring-white/15 transition-colors hover:bg-white/14', className)}
      aria-label={`${s.long}. Ver horarios`}
    >
      <Led state={s.state} />
      <span className="tabular">{detailed ? s.long : s.short}</span>
    </Link>
  );
}

export function Led({ state, className }: { state: keyof typeof COLORS; className?: string }) {
  const c = COLORS[state];
  return (
    <span className={cn('relative inline-flex size-2.5', className)} aria-hidden="true">
      {state === 'open' && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ backgroundColor: c }} />}
      <span className="relative inline-flex size-2.5 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}` }} />
    </span>
  );
}
