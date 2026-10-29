'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, MapPin, Ruler, ShoppingBag, Store } from 'lucide-react';
import { useCart } from '@/components/store/cart';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/tienda', label: 'Tienda', icon: Store },
  { href: '/carrito', label: 'Carrito', icon: ShoppingBag, primary: true },
  { href: '/cotizar', label: 'Cotizar', icon: Ruler },
  { href: '/contacto', label: 'Taller', icon: MapPin },
];

/** Barra inferior para celular: lo importante a un pulgar de distancia */
export function TabBar() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  return (
    <nav aria-label="Navegación rápida" className="glass-dark fixed inset-x-0 bottom-0 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-md grid-cols-5 items-stretch px-1">
        {TABS.map((t) => {
          const on = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex">
              <Link href={t.href} aria-current={on ? 'page' : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold">
                {t.primary ? (
                  <span className={cn('relative grid size-11 place-items-center rounded-lg transition-colors', on ? 'bg-white text-ink' : 'bg-lime text-ink')}>
                    <Icon className="size-5" />
                    {ready && count > 0 && (
                      <span className="tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] font-extrabold text-lime ring-2 ring-lime">{count > 99 ? '99+' : count}</span>
                    )}
                  </span>
                ) : (
                  <Icon className={cn('size-5 transition-colors', on ? 'text-lime' : 'text-white/70')} />
                )}
                <span className={cn(t.primary ? 'sr-only' : on ? 'text-white' : 'text-white/60')}>{t.label}</span>
                {on && !t.primary && <motion.span layoutId="tab-cut" className="cut-line absolute inset-x-4 top-0" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
