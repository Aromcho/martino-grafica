'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  BookImage,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings,
  SquareStack,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { LogoMark } from '@/components/brand/plotter-logo';
import { useAdminQuery, useMe } from '@/lib/admin';
import { post } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import type { AdminStats } from '@/lib/types';
import { LoadingBlock } from './ui';

type Item = { href: string; label: string; icon: LucideIcon; badge?: 'quotes'; admin?: boolean };
const NAV: { title?: string; items: Item[] }[] = [
  {
    items: [
      { href: '/admin', label: 'Inicio', icon: LayoutDashboard },
      { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: 'quotes' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { href: '/admin/trabajos', label: 'Trabajos', icon: SquareStack },
      { href: '/admin/servicios', label: 'Servicios', icon: Package },
      { href: '/admin/rubros', label: 'Rubros', icon: LayoutGrid },
      { href: '/admin/historias', label: 'Historias', icon: BookImage },
      { href: '/admin/banners', label: 'Banners', icon: Megaphone },
      { href: '/admin/medios', label: 'Medios', icon: Images },
    ],
  },
  {
    title: 'El taller',
    items: [
      { href: '/admin/horarios', label: 'Horarios', icon: CalendarClock },
      { href: '/admin/ajustes', label: 'Datos y ajustes', icon: Settings },
      { href: '/admin/usuarios', label: 'Usuarios', icon: Users, admin: true },
    ],
  },
];

const TABS: Item[] = [
  { href: '/admin', label: 'Inicio', icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: 'quotes' },
  { href: '/admin/trabajos', label: 'Trabajos', icon: SquareStack },
  { href: '/admin/servicios', label: 'Servicios', icon: Package },
];

const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

function NavList({ onNavigate, newQuotes, isAdmin }: { onNavigate?: () => void; newQuotes: number; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6" aria-label="Panel">
      {NAV.map((group, gi) => (
        <div key={gi}>
          {group.title && <p className="mb-1.5 px-3 text-xs font-bold text-smoke">{group.title}</p>}
          <ul className="space-y-0.5">
            {group.items
              .filter((it) => !it.admin || isAdmin)
              .map((it) => {
                const active = isActive(pathname, it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      className={cn('relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[0.93rem] font-semibold transition-colors', active ? 'text-ink' : 'text-white/70 hover:bg-white/8 hover:text-white')}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-md bg-lime" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                      <Icon className="relative size-[1.15rem]" aria-hidden="true" />
                      <span className="relative flex-1">{it.label}</span>
                      {it.badge === 'quotes' && newQuotes > 0 && <span className={cn('tabular relative rounded px-1.5 py-0.5 text-xs font-bold', active ? 'bg-ink text-lime' : 'bg-cut text-white')}>{newQuotes}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const me = useMe();
  const [menu, setMenu] = useState(false);
  const stats = useAdminQuery<AdminStats>(['stats'], '/admin/stats', { enabled: !!me.data, refetchInterval: 60_000 });
  const newQuotes = stats.data?.totals.quotesNew ?? 0;
  const isAdmin = me.data?.role === 'ADMIN';

  useEffect(() => {
    if (me.isError) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isError, router, pathname]);

  const logout = async () => {
    await post('/auth/logout').catch(() => {});
    qc.clear();
    router.replace('/admin/login');
  };

  if (!me.data) return <LoadingBlock />;

  const footer = (
    <div className="space-y-1 border-t border-white/10 pt-4">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/8 hover:text-white">
        <ExternalLink className="size-4" /> Ver la web
      </a>
      <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-white/70 hover:bg-white/8 hover:text-white">
        <LogOut className="size-4" /> Salir <span className="truncate text-white/45">({me.data.name})</span>
      </button>
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-7 overflow-y-auto bg-ink px-3 py-6 text-white lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-3">
          <LogoMark className="w-20" />
          <span className="text-xs font-semibold leading-tight text-smoke">
            Panel
            <br />
            del taller
          </span>
        </Link>
        <div className="flex-1">
          <NavList newQuotes={newQuotes} isAdmin={isAdmin} />
        </div>
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white lg:hidden">
        <Link href="/admin" aria-label="Inicio del panel">
          <LogoMark className="w-16" />
        </Link>
        <span className="text-sm font-semibold text-smoke">Panel</span>
        <button type="button" onClick={() => setMenu(true)} className="ml-auto grid size-10 place-items-center rounded-md bg-white/10" aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
      </header>

      <Drawer.Root open={menu} onOpenChange={setMenu} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50" />
          <Drawer.Content className="fixed inset-y-0 right-0 z-[61] flex w-[min(19rem,86vw)] flex-col gap-6 overflow-y-auto bg-ink px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white outline-none" data-lenis-prevent>
            <Drawer.Title className="flex items-center gap-3 px-3">
              <LogoMark className="w-16" />
              <span className="text-sm font-semibold text-smoke">Panel</span>
            </Drawer.Title>
            <Drawer.Description className="sr-only">Secciones del panel</Drawer.Description>
            <div className="flex-1">
              <NavList onNavigate={() => setMenu(false)} newQuotes={newQuotes} isAdmin={isAdmin} />
            </div>
            {footer}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <main className="min-w-0 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:px-6 lg:px-10 lg:py-10">
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-6xl">
          {children}
        </motion.div>
      </main>

      {/* Barra inferior del celular: lo que más se usa a un toque */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Accesos rápidos">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link href={t.href} className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-bold', on ? 'text-ink' : 'text-slate')} aria-current={on ? 'page' : undefined}>
                  {on && <motion.span layoutId="admin-tab" className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-ink" />}
                  <span className="relative">
                    <Icon className="size-5" />
                    {t.badge === 'quotes' && newQuotes > 0 && <span className="tabular absolute -right-3 -top-1.5 min-w-4 rounded bg-cut px-1 text-[0.62rem] leading-4 text-white">{newQuotes}</span>}
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMenu(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-bold text-slate">
              <Menu className="size-5" /> Más
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
