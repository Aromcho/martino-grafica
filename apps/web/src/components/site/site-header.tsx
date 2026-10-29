'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/brand/plotter-logo';
import { CartButton } from '@/components/store/cart';
import { cn } from '@/lib/cn';
import { StatusPill } from './status-pill';
import { useUI } from './ui-provider';

export const NAV = [
  { href: '/tienda', label: 'Tienda' },
  { href: '/trabajos', label: 'Trabajos' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/historias', label: 'Historias' },
  { href: '/contacto', label: 'El taller' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { openSearch } = useUI();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    setHidden(y > 320 && y > prev + 4);
    if (y < prev - 4) setHidden(false);
  });

  // Las barras pegajosas de cada página (filtros) se acomodan debajo del header cuando está visible
  useEffect(() => {
    document.documentElement.style.setProperty('--header-offset', hidden ? '0px' : 'calc(var(--header-h) + env(safe-area-inset-top))');
  }, [hidden]);

  return (
    <motion.header
      animate={{ y: hidden ? '-100%' : 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300', solid ? 'glass-dark border-b border-white/8' : 'bg-transparent')}
    >
      <div className="container-x flex h-[var(--header-h)] items-center gap-3">
        <Link href="/" className="mr-auto flex items-center gap-3" aria-label="Martino Gráfica, inicio">
          <LogoMark className="w-[5.25rem] lg:w-24" />
          <span className="hidden text-[0.7rem] font-semibold leading-tight text-smoke sm:block">
            Martino Gráfica
            <br />
            Villa Gesell
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {NAV.map((n) => {
            const on = pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cn('relative rounded-md px-3 py-2 text-[0.95rem] font-semibold transition-colors', on ? 'text-white' : 'text-white/70 hover:text-white')}>
                {n.label}
                {on && <motion.span layoutId="nav-cut" className="cut-line absolute inset-x-3 -bottom-0.5" />}
              </Link>
            );
          })}
        </nav>
        <StatusPill className="max-sm:hidden" />
        <button type="button" onClick={openSearch} className="grid size-10 place-items-center rounded-md text-white/85 hover:bg-white/10 hover:text-white" aria-label="Buscar (Ctrl+K)">
          <Search className="size-5" />
        </button>
        <CartButton />
        <Link href="/tienda" className="hidden h-10 items-center rounded-md bg-lime px-4 text-sm font-bold text-ink transition-colors hover:bg-white sm:inline-flex">
          Comprar
        </Link>
      </div>
    </motion.header>
  );
}
