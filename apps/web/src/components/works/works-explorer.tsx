'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { get } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import type { Paginated, WorkCard as Work, WorkFacets } from '@/lib/types';
import { WorkCard } from './work-card';

const PAGE = 24;

type Filters = { rubro: string; zona: string; q: string };

function useDebounced<T>(value: T, ms = 280) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function toQuery(f: Filters, page: number) {
  const sp = new URLSearchParams();
  if (f.rubro) sp.set('category', f.rubro);
  if (f.zona) sp.set('location', f.zona);
  if (f.q) sp.set('q', f.q);
  sp.set('page', String(page));
  sp.set('pageSize', String(PAGE));
  return `/works?${sp}`;
}

/**
 * Portfolio filtrable: rubro, localidad y búsqueda libre. La URL refleja los filtros
 * (se puede compartir "/trabajos?rubro=carteleria") y la lista carga más al llegar al final.
 */
export function WorksExplorer({ facets, initial, initialFilters }: { facets: WorkFacets; initial: Paginated<Work>; initialFilters: Filters }) {
  const [rubro, setRubro] = useState(initialFilters.rubro);
  const [zona, setZona] = useState(initialFilters.zona);
  const [text, setText] = useState(initialFilters.q);
  const q = useDebounced(text.trim());
  const filters = useMemo(() => ({ rubro, zona, q }), [rubro, zona, q]);
  const isInitial = rubro === initialFilters.rubro && zona === initialFilters.zona && q === initialFilters.q;

  const query = useInfiniteQuery({
    queryKey: ['works', filters],
    queryFn: ({ pageParam }) => get<Paginated<Work>>(toQuery(filters, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    initialData: isInitial ? { pages: [initial], pageParams: [1] } : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  // La URL acompaña a los filtros sin recargar la página
  useEffect(() => {
    const sp = new URLSearchParams();
    if (rubro) sp.set('rubro', rubro);
    if (zona) sp.set('zona', zona);
    if (q) sp.set('q', q);
    const url = `${window.location.pathname}${sp.size ? `?${sp}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
  }, [rubro, zona, q]);

  // Carga automática al acercarse al final
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const all = facets.categories.reduce((n, c) => n + c.n, 0);
  const filtered = Boolean(rubro || zona || q);
  const loading = query.isFetching && !isFetchingNextPage;

  const clear = () => {
    setRubro('');
    setZona('');
    setText('');
  };

  return (
    <div>
      {/* Filtros: quedan a mano mientras se recorre la grilla */}
      <div className="sticky top-[var(--header-offset,0px)] z-30 border-b border-white/10 bg-ink/92 py-3 backdrop-blur-md transition-[top] duration-300 ease-out-expo">
        <div className="container-x space-y-3">
          <div className="flex gap-2">
            <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-md bg-white/7 ring-1 ring-white/14 focus-within:ring-white/40 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 size-4 text-smoke" aria-hidden="true" />
              <span className="sr-only">Buscar en los trabajos</span>
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Buscar trabajos"
                className="h-full w-full bg-transparent pl-9 pr-9 text-[0.95rem] text-white outline-none placeholder:text-smoke"
                enterKeyHint="search"
              />
              {text && (
                <button type="button" onClick={() => setText('')} className="absolute right-1.5 grid size-8 place-items-center rounded text-smoke hover:text-white" aria-label="Borrar búsqueda">
                  <X className="size-4" />
                </button>
              )}
            </label>
            {facets.locations.length > 1 && (
              <label className="relative">
                <span className="sr-only">Localidad</span>
                <select
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  className={cn('h-11 max-w-[9.5rem] appearance-none rounded-md bg-white/7 pl-3 pr-8 text-[0.92rem] font-semibold outline-none ring-1 ring-white/14 sm:max-w-none', zona && 'bg-lime text-ink ring-0')}
                >
                  <option value="">Todas las zonas</option>
                  {facets.locations.map((l) => (
                    <option key={l.location} value={l.location}>
                      {l.location} ({l.n})
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-70" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </label>
            )}
          </div>
          <div className="scroll-x -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Rubro">
            <button type="button" className="chip" aria-pressed={!rubro} onClick={() => setRubro('')}>
              Todos <span className="n">{all}</span>
            </button>
            {facets.categories.map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={rubro === c.slug} onClick={() => setRubro(rubro === c.slug ? '' : c.slug)}>
                {c.shortName ?? c.name} <span className="n">{c.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-x pt-6">
        <div className="mb-8 flex min-h-8 items-center justify-between gap-4" aria-live="polite">
          <p className="tabular text-sm text-smoke">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Buscando…
              </span>
            ) : (
              <>
                {plural(total, 'trabajo', 'trabajos')}
                {filtered && ' con esos filtros'}
              </>
            )}
          </p>
          {filtered && (
            <button type="button" onClick={clear} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <ul className={cn('grid grid-cols-2 gap-x-5 gap-y-9 px-[10px] sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4', loading && 'opacity-60 transition-opacity')}>
            {items.map((w, i) => (
              <li key={w.id}>
                <WorkCard work={w} compact priority={i < 4} sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 46vw" />
              </li>
            ))}
          </ul>
        ) : (
          !loading && (
            <div className="liner rounded-md px-6 py-14 text-center">
              <p className="display t-sm">No hay trabajos con esos filtros</p>
              <p className="mx-auto mt-3 max-w-md text-slate">Probá con otra palabra o sacá algún filtro. Si buscás algo que no ves, preguntanos: seguro lo hacemos.</p>
              <button type="button" onClick={clear} className={buttonClass('ink', 'md', 'mt-6')}>
                Ver todos los trabajos
              </button>
            </div>
          )
        )}

        <div ref={sentinel} className="flex justify-center py-12">
          {hasNextPage && (
            <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className={buttonClass('outline', 'md', 'text-white')}>
              {isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
              Ver más trabajos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
