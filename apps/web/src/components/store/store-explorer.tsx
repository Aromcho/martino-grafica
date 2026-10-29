'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useBusiness } from '@/components/site/business-provider';
import { get } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { plural, waLink } from '@/lib/format';
import type { StoreCategory, StoreList, StoreSort } from '@/lib/types';
import { ProductTile } from './product-tile';

const PAGE = 24;

export type StoreFilters = { categoria: string; sub: string; q: string; orden: StoreSort; stock: boolean };

const SORT_LABEL: Record<StoreSort, string> = {
  relevancia: 'Más elegidos',
  'precio-asc': 'Menor precio',
  'precio-desc': 'Mayor precio',
  nombre: 'A a Z',
  nuevos: 'Nuevos',
};

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function toQuery(f: StoreFilters, page: number) {
  const sp = new URLSearchParams();
  if (f.categoria) sp.set('category', f.categoria);
  if (f.sub) sp.set('sub', f.sub);
  if (f.q) sp.set('q', f.q);
  if (f.orden !== 'relevancia') sp.set('sort', f.orden);
  if (f.stock) sp.set('stock', '1');
  sp.set('page', String(page));
  sp.set('pageSize', String(PAGE));
  return `/store/products?${sp}`;
}

/**
 * Catálogo de la tienda: categorías, sub-rubros, búsqueda por palabras y orden.
 * La URL acompaña los filtros (/tienda?categoria=vinilos&q=negro mate) y carga más al llegar al final.
 */
export function StoreExplorer({ categories, initial, initialFilters }: { categories: StoreCategory[]; initial: StoreList; initialFilters: StoreFilters }) {
  const { info } = useBusiness();
  const [categoria, setCategoria] = useState(initialFilters.categoria);
  const [sub, setSub] = useState(initialFilters.sub);
  const [orden, setOrden] = useState<StoreSort>(initialFilters.orden);
  const [stock, setStock] = useState(initialFilters.stock);
  const [text, setText] = useState(initialFilters.q);
  const q = useDebounced(text.trim());
  const filters = useMemo<StoreFilters>(() => ({ categoria, sub, q, orden, stock }), [categoria, sub, q, orden, stock]);
  const isInitial = JSON.stringify(filters) === JSON.stringify({ ...initialFilters, q: initialFilters.q.trim() });

  const query = useInfiniteQuery({
    queryKey: ['store', filters],
    queryFn: ({ pageParam }) => get<StoreList>(toQuery(filters, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    initialData: isInitial ? { pages: [initial], pageParams: [1] } : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  useEffect(() => {
    const sp = new URLSearchParams();
    if (categoria) sp.set('categoria', categoria);
    if (sub) sp.set('sub', sub);
    if (q) sp.set('q', q);
    if (orden !== 'relevancia') sp.set('orden', orden);
    if (stock) sp.set('stock', '1');
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${sp.size ? `?${sp}` : ''}`);
  }, [categoria, sub, q, orden, stock]);

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '700px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = first?.total ?? 0;
  const subs = first?.subcategories ?? [];
  const current = categories.find((c) => c.slug === categoria);
  const all = categories.reduce((n, c) => n + c.productCount, 0);
  const filtered = Boolean(categoria || sub || q || stock);
  const loading = query.isFetching && !isFetchingNextPage;

  const pickCategory = (slug: string) => {
    setCategoria(slug);
    setSub('');
    window.scrollTo({ top: Math.min(window.scrollY, 260), behavior: 'smooth' });
  };
  const clear = () => {
    setCategoria('');
    setSub('');
    setText('');
    setStock(false);
  };

  return (
    <div>
      <div className="sticky top-[var(--header-offset,0px)] z-30 border-b border-white/10 bg-ink/92 py-3 backdrop-blur-md transition-[top] duration-300 ease-out-expo">
        <div className="container-x space-y-3">
          <div className="flex gap-2">
            <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-md bg-white/7 ring-1 ring-white/14 focus-within:ring-white/40 lg:max-w-lg">
              <Search className="pointer-events-none absolute left-3 size-4 text-smoke" aria-hidden="true" />
              <span className="sr-only">Buscar productos</span>
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={current ? `Buscar en ${current.name.toLowerCase()}` : 'Buscar: vinilo negro mate, lona, PVC…'}
                className="h-full w-full bg-transparent pl-9 pr-9 text-[0.95rem] text-white outline-none placeholder:text-smoke"
                enterKeyHint="search"
              />
              {text && (
                <button type="button" onClick={() => setText('')} className="absolute right-1.5 grid size-8 place-items-center rounded text-smoke hover:text-white" aria-label="Borrar búsqueda">
                  <X className="size-4" />
                </button>
              )}
            </label>
            <label className="relative shrink-0">
              <span className="sr-only">Ordenar</span>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as StoreSort)}
                className="h-11 max-w-[9.5rem] appearance-none rounded-md bg-white/7 pl-3 pr-8 text-[0.92rem] font-semibold outline-none ring-1 ring-white/14 sm:max-w-none"
              >
                {(Object.keys(SORT_LABEL) as StoreSort[]).map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABEL[s]}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-70" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </label>
          </div>
          <div className="scroll-x -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Categoría">
            <button type="button" className="chip" aria-pressed={!categoria} onClick={() => pickCategory('')}>
              Todo <span className="n">{all}</span>
            </button>
            {categories.map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={categoria === c.slug} onClick={() => pickCategory(categoria === c.slug ? '' : c.slug)}>
                {c.name} <span className="n">{c.productCount}</span>
              </button>
            ))}
          </div>
          {categoria && subs.length > 1 && (
            <div className="scroll-x -mx-4 gap-1.5 px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Tipo">
              {subs.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSub(sub === s.name ? '' : s.name)}
                  aria-pressed={sub === s.name}
                  className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[0.85rem] font-semibold transition-colors', sub === s.name ? 'bg-white text-ink' : 'text-white/75 ring-1 ring-inset ring-white/12 hover:text-white')}
                >
                  {s.name} <span className="tabular opacity-60">{s.n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container-x pt-6">
        <div className="mb-7 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2" aria-live="polite">
          <p className="tabular text-sm text-smoke">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Buscando…
              </span>
            ) : (
              <>
                {plural(total, 'producto', 'productos')}
                {current ? ` en ${current.name.toLowerCase()}` : ''}
                {q ? ` para «${q}»` : ''}
              </>
            )}
          </p>
          <div className="flex items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
              <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} className="size-4 accent-[var(--color-lime)]" />
              Sólo con stock
            </label>
            {filtered && (
              <button type="button" onClick={clear} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {current?.tagline && !q && !sub && <p className="-mt-3 mb-7 max-w-2xl text-[0.95rem] text-white/70">{current.tagline}</p>}

        {items.length > 0 ? (
          <ul className={cn('grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5', loading && 'opacity-60 transition-opacity')}>
            {items.map((p, i) => (
              <li key={p.id} className="flex">
                <ProductTile product={p} priority={i < 4} className="w-full" />
              </li>
            ))}
          </ul>
        ) : (
          !loading && (
            <div className="liner rounded-md px-6 py-14 text-center">
              <p className="display t-sm">{total === 0 && !filtered ? 'Estamos cargando el catálogo' : 'No encontramos ese producto'}</p>
              <p className="mx-auto mt-3 max-w-md text-slate">
                {total === 0 && !filtered ? 'En unos minutos vas a ver todos los productos. Mientras tanto, preguntanos por WhatsApp.' : 'Probá con otra palabra o sacá algún filtro. Si no lo ves, preguntanos: muchas cosas las conseguimos por pedido.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {filtered && (
                  <button type="button" onClick={clear} className={buttonClass('ink', 'md')}>
                    Ver todo
                  </button>
                )}
                {info?.whatsapp && (
                  <a href={waLink(info.whatsapp, `Hola Martino Gráfica 👋 ¿Tienen ${q || 'este producto'}?`)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md', 'text-ink')}>
                    <WhatsAppIcon className="size-5" /> Preguntar
                  </a>
                )}
              </div>
            </div>
          )
        )}

        <div ref={sentinel} className="flex justify-center py-12">
          {hasNextPage && (
            <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className={buttonClass('outline', 'md', 'text-white')}>
              {isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
              Ver más productos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
