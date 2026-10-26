'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Eye, Loader2, Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Btn, EmptyState, LoadingBlock, PageHeader, SegmentedTabs } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import { get } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Category, Paginated, WorkCard } from '@/lib/types';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function WorksAdminPage() {
  const cats = useAdminQuery<Category[]>(['admin-categories'], '/admin/categories');
  const [cat, setCat] = useState('ALL');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const query = useInfiniteQuery({
    queryKey: ['admin-works', cat, q],
    queryFn: ({ pageParam }) => get<Paginated<WorkCard>>(`/admin/works?page=${pageParam}&pageSize=40${cat !== 'ALL' ? `&category=${cat}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const toggle = useAdminMutation<{ id: string; featured: boolean }>({
    method: 'PATCH',
    path: (v) => `/admin/works/${v.id}`,
    body: (v) => ({ featured: v.featured }),
    invalidate: [['admin-works']],
    success: (r) => ((r as { featured?: boolean }).featured ? 'Destacado en el inicio' : 'Ya no está destacado'),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const options = [{ value: 'ALL', label: 'Todos', count: (cats.data ?? []).reduce((n, c) => n + c.workCount, 0) }, ...(cats.data ?? []).map((c) => ({ value: c.slug, label: c.shortName ?? c.name, count: c.workCount }))];

  return (
    <>
      <PageHeader
        title="Trabajos"
        text="El portfolio de la web. Las estrellas marcan los que salen en el inicio."
        actions={
          <Link href="/admin/trabajos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-white hover:bg-steel">
            <Plus className="size-4" /> Cargar trabajo
          </Link>
        }
      />
      <div className="space-y-3">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <span className="sr-only">Buscar trabajos</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por título, cliente, lugar o material" className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[0.95rem] outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
        </label>
        <SegmentedTabs value={cat} onChange={setCat} options={options} className="-mx-4 px-4 sm:mx-0 sm:px-0" />
      </div>
      <p className="tabular mt-4 text-sm text-slate">{total} trabajos</p>
      <div className="mt-3">
        {query.isLoading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No hay trabajos con ese filtro" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((w) => (
              <li key={w.id} className="relative overflow-hidden rounded-md bg-white ring-1 ring-black/8">
                <Link href={`/admin/trabajos/${w.id}`} className="block">
                  <Img media={w.cover} ratio="4/5" sizes="(min-width: 1024px) 20vw, 46vw" className={cn(!w.active && 'opacity-50 grayscale')} />
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-bold leading-snug">{w.title}</span>
                    <span className="mt-1 block truncate text-xs text-slate">{[w.location, w.doneAt ? formatDate(w.doneAt, { month: 'short', year: 'numeric' }) : ''].filter(Boolean).join(', ')}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {!w.active && <Badge tone="red">Oculto</Badge>}
                      <span className="tabular inline-flex items-center gap-1 text-xs text-slate">
                        <Eye className="size-3" /> {w.views}
                      </span>
                      <span className="text-xs text-slate">· {w.imageCount} fotos</span>
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: w.id, featured: !w.featured })}
                  className={cn('absolute right-2 top-2 grid size-9 place-items-center rounded-md backdrop-blur', w.featured ? 'bg-lime text-ink' : 'bg-black/45 text-white')}
                  aria-label={w.featured ? 'Quitar de destacados' : 'Destacar en el inicio'}
                  aria-pressed={w.featured}
                >
                  <Star className={cn('size-4', w.featured && 'fill-current')} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.hasNextPage && (
          <div className="mt-5 flex justify-center">
            <Btn variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />} Ver más
            </Btn>
          </div>
        )}
      </div>
    </>
  );
}
