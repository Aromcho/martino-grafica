'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Drawer } from 'vaul';
import { buttonClass } from '@/components/ui/button';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { Media, StoreCard } from '@/lib/types';

export interface CartLine {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  unit: string;
  image: Media | null;
  qty: number;
}

interface CartCtx {
  lines: CartLine[];
  ready: boolean;
  count: number;
  total: number;
  unpriced: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Pick<StoreCard, 'id' | 'slug' | 'name' | 'price' | 'unit' | 'image'>, qty?: number, opts?: { silent?: boolean }) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const KEY = 'mg-carrito-v1';
const MAX = 999;
const Ctx = createContext<CartCtx | null>(null);

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(data) ? data.filter((l) => l && typeof l.id === 'string' && l.qty > 0) : [];
  } catch {
    return [];
  }
}

/** Carrito de la tienda: vive en el navegador (localStorage) y los precios se recalculan en la API al pedir */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* navegación privada: el carrito dura mientras la pestaña esté abierta */
    }
  }, [lines, ready]);

  const add = useCallback<CartCtx['add']>((p, qty = 1, opts) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === p.id);
      if (i === -1) return [...prev, { id: p.id, slug: p.slug, name: p.name, price: p.price, unit: p.unit, image: p.image, qty: Math.min(MAX, qty) }];
      const next = [...prev];
      next[i] = { ...next[i], price: p.price, image: p.image ?? next[i].image, qty: Math.min(MAX, next[i].qty + qty) };
      return next;
    });
    if (!opts?.silent)
      toast.success('Agregado al carrito', {
        description: p.name,
        action: { label: 'Ver carrito', onClick: () => setOpen(true) },
      });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX, Math.round(qty)) } : l))));
  }, []);
  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const total = lines.reduce((n, l) => n + (l.price ?? 0) * l.qty, 0);
    const unpriced = lines.filter((l) => l.price == null).length;
    return { lines, ready, count, total, unpriced, open, setOpen, add, setQty, remove, clear };
  }, [lines, ready, open, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart fuera de CartProvider');
  return ctx;
}

/** − 1 + para cantidades */
export function QtyStepper({ value, onChange, size = 'md', className, label = 'Cantidad' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md'; className?: string; label?: string }) {
  const h = size === 'sm' ? 'h-9' : 'h-12';
  const w = size === 'sm' ? 'w-9' : 'w-11';
  return (
    <div className={cn('inline-flex items-stretch overflow-hidden rounded-lg ring-1 ring-inset ring-white/20', h, className)} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} className={cn('grid place-items-center text-white/80 hover:bg-white/10 hover:text-white', w)} aria-label="Uno menos">
        <Minus className="size-4" />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(MAX, n)));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="tabular w-11 bg-transparent text-center font-bold outline-none"
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(value + 1)} className={cn('grid place-items-center text-white/80 hover:bg-white/10 hover:text-white', w)} aria-label="Uno más">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function CartLineRow({ line, compact }: { line: CartLine; compact?: boolean }) {
  const { setQty, remove } = useCart();
  return (
    <li className="flex gap-3 py-4">
      <Link href={`/tienda/${line.slug}`} className="shrink-0 overflow-hidden rounded-[3px] bg-white">
        <Img media={line.image} alt={line.name} sizes="80px" fit="contain" ratio="1/1" className={cn(compact ? 'w-16' : 'w-20', '!bg-white')} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link href={`/tienda/${line.slug}`} className="line-clamp-2 min-w-0 flex-1 text-[0.95rem] font-semibold leading-snug hover:text-lime">
            {line.name}
          </Link>
          <button type="button" onClick={() => remove(line.id)} className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white" aria-label={`Quitar ${line.name}`}>
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <QtyStepper size="sm" value={line.qty} onChange={(v) => setQty(line.id, v)} label={`Cantidad de ${line.name}`} />
          <span className="tabular text-right text-sm">
            {line.price != null ? (
              <>
                <span className="block font-bold">{money(line.price * line.qty)}</span>
                {line.qty > 1 && <span className="block text-xs text-smoke">{money(line.price)} c/u</span>}
              </>
            ) : (
              <span className="text-smoke">Precio a consultar</span>
            )}
          </span>
        </div>
      </div>
    </li>
  );
}

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 64rem)');
    const fn = () => setDesktop(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}

/** Panel del carrito: lateral en escritorio, hoja desde abajo en el celular */
export function CartDrawer() {
  const { lines, open, setOpen, count, total, unpriced } = useCart();
  const desktop = useDesktop();
  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction={desktop ? 'right' : 'bottom'} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            'fixed z-[71] flex flex-col bg-graphite text-white outline-none ring-1 ring-white/10',
            desktop ? 'inset-y-3 right-3 w-[min(30rem,calc(100vw-1.5rem))] rounded-md shadow-2xl' : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl',
          )}
          data-lenis-prevent
        >
          {!desktop && <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20" />}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <Drawer.Title className="display text-[1.6rem]">Tu carrito</Drawer.Title>
            <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-white/10" aria-label="Cerrar carrito">
              <X className="size-5" />
            </button>
          </div>
          <Drawer.Description className="sr-only">Productos que vas a pedir</Drawer.Description>
          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
              <ShoppingBag className="size-10 text-white/30" />
              <p className="text-smoke">Todavía no agregaste productos.</p>
              <Link href="/tienda" onClick={() => setOpen(false)} className={buttonClass('lime', 'md')}>
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-white/10 overflow-y-auto overscroll-contain px-5">
                {lines.map((l) => (
                  <CartLineRow key={l.id} line={l} compact />
                ))}
              </ul>
              <div className="space-y-3 border-t border-white/10 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                <div className="flex items-baseline justify-between">
                  <span className="text-smoke">
                    {count} {count === 1 ? 'unidad' : 'unidades'}
                  </span>
                  <span className="tabular display text-[1.7rem]">{money(total)}</span>
                </div>
                {unpriced > 0 && <p className="text-xs text-smoke">+ {unpriced === 1 ? 'un producto' : `${unpriced} productos`} con precio a consultar.</p>}
                <Link href="/carrito" onClick={() => setOpen(false)} className={buttonClass('lime', 'lg', 'w-full')}>
                  Finalizar pedido
                </Link>
                <p className="text-center text-xs text-smoke">Confirmás stock, pago y entrega por WhatsApp con el taller.</p>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Botón del header con la cantidad */
export function CartButton({ className }: { className?: string }) {
  const { count, setOpen, ready } = useCart();
  return (
    <button type="button" onClick={() => setOpen(true)} className={cn('relative grid size-10 place-items-center rounded-md text-white/85 hover:bg-white/10 hover:text-white', className)} aria-label={`Carrito${count ? `: ${count} ${count === 1 ? 'unidad' : 'unidades'}` : ''}`}>
      <ShoppingBag className="size-5" />
      {ready && count > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[0.7rem] font-extrabold text-ink">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  );
}
