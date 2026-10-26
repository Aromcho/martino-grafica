'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState } from 'react';

/** Buscador de la página /buscar (el atajo Ctrl+K abre el buscador rápido) */
export function SearchForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="mt-8 flex max-w-2xl gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        router.push(t ? `/buscar?q=${encodeURIComponent(t)}` : '/buscar');
      }}
    >
      <label className="relative flex h-14 min-w-0 flex-1 items-center rounded-lg bg-white/8 ring-1 ring-white/15 focus-within:ring-white/45">
        <Search className="pointer-events-none absolute left-4 size-5 text-smoke" aria-hidden="true" />
        <span className="sr-only">Qué buscás</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={!initial} enterKeyHint="search" placeholder="Camioneta, neón, Mar Azul…" className="h-full w-full bg-transparent pl-12 pr-4 text-lg text-white outline-none placeholder:text-smoke" />
      </label>
      <button type="submit" className="h-14 rounded-lg bg-lime px-5 font-bold text-ink hover:bg-white">
        Buscar
      </button>
    </form>
  );
}
