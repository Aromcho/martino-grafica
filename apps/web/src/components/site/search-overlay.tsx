'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Img } from '@/components/ui/img';
import { get } from '@/lib/client-api';
import { monthYear } from '@/lib/format';
import type { SearchResults } from '@/lib/types';
import { useUI } from './ui-provider';

const SUGGESTIONS = ['Ploteo de camioneta', 'Neón LED', 'Corpóreas', 'Esmerilado', 'Calcos para motos', 'Remeras', 'Gorras trucker', 'Carteles inmobiliarios', 'Mar Azul', 'Negro mate'];

function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

type Row = { href: string; title: string; meta: string; media: SearchResults['works'][number]['cover']; kind: string };

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = useDebounced(q.trim());

  const { data, isFetching } = useQuery({
    queryKey: ['search', term],
    queryFn: () => get<SearchResults>(`/search?q=${encodeURIComponent(term)}`),
    enabled: searchOpen && term.length > 1,
    placeholderData: (prev) => prev,
  });

  const rows: Row[] = useMemo(() => {
    if (term.length < 2 || !data) return [];
    return [
      ...data.categories.map((c) => ({ href: `/servicios#${c.slug}`, title: c.name, meta: c.tagline ?? 'Rubro', media: c.cover, kind: 'Rubro' })),
      ...data.products.map((p) => ({ href: `/servicios/${p.slug}`, title: p.name, meta: p.category?.name ?? 'Servicio', media: p.cover, kind: 'Servicio' })),
      ...data.works.map((w) => ({ href: `/trabajos/${w.slug}`, title: w.title, meta: [w.location, monthYear(w.doneAt)].filter(Boolean).join(', '), media: w.cover, kind: 'Trabajo' })),
    ];
  }, [data, term]);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [searchOpen]);

  useEffect(() => setActive(0), [term]);

  const go = (href: string) => {
    closeSearch();
    router.push(href);
  };
  const all = `/buscar?q=${encodeURIComponent(q.trim())}`;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(rows.length, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && q.trim()) {
      e.preventDefault();
      go(active < rows.length ? rows[active].href : all);
    }
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <button type="button" aria-label="Cerrar buscador" onClick={closeSearch} className="absolute inset-0 hidden bg-black/70 backdrop-blur-sm lg:block" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar en el sitio"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent
            className="relative flex h-full flex-col bg-graphite lg:mx-auto lg:mt-[10vh] lg:h-auto lg:max-h-[76vh] lg:max-w-2xl lg:overflow-hidden lg:rounded-xl lg:ring-1 lg:ring-white/10"
            onKeyDown={onKey}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] lg:px-5 lg:pt-4">
              <Search className="size-5 shrink-0 text-lime" aria-hidden="true" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscá trabajos, servicios, materiales…"
                className="h-11 min-w-0 flex-1 bg-transparent text-[1.05rem] text-white outline-none placeholder:text-smoke"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="Buscar"
              />
              {isFetching && <Loader2 className="size-4 animate-spin text-smoke" aria-hidden="true" />}
              {q && (
                <button type="button" onClick={() => setQ('')} className="grid size-8 place-items-center rounded-md bg-white/10 text-smoke" aria-label="Borrar búsqueda">
                  <X className="size-4" />
                </button>
              )}
              <button type="button" onClick={closeSearch} className="text-sm font-bold text-lime lg:hidden">
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-5">
              {term.length < 2 && (
                <div>
                  <p className="mb-3 text-sm text-smoke">Probá con</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setQ(s)} className="rounded-md bg-white/8 px-3 py-2 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/14">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {term.length >= 2 && data && rows.length === 0 && !isFetching && (
                <div className="py-10 text-center">
                  <p className="text-lg font-bold">No encontramos «{term}»</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-smoke">Probá con otra palabra o pedinos presupuesto: hacemos trabajos a medida.</p>
                  <Link href="/cotizar" onClick={closeSearch} className="mt-5 inline-flex h-11 items-center rounded-lg bg-lime px-5 font-bold text-ink">
                    Pedir presupuesto
                  </Link>
                </div>
              )}
              {rows.length > 0 && (
                <ul className="space-y-1" role="listbox" aria-label="Resultados">
                  {rows.map((r, i) => (
                    <li key={r.href} role="option" aria-selected={i === active}>
                      <Link
                        href={r.href}
                        onClick={closeSearch}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${i === active ? 'bg-white/10' : ''}`}
                      >
                        <Img media={r.media} sizes="56px" className="size-14 shrink-0 rounded-md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{r.title}</span>
                          <span className="block truncate text-sm text-smoke">{r.meta}</span>
                        </span>
                        <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-smoke ring-1 ring-white/15">{r.kind}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={all} onClick={closeSearch} className={`mt-2 block rounded-lg p-3 text-center text-sm font-bold text-lime ${active === rows.length ? 'bg-white/10' : ''}`}>
                      Ver todos los resultados
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
