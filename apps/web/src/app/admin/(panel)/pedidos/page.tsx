'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Paperclip, Search } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/admin/status';
import { Btn, EmptyState, LoadingBlock, PageHeader, SegmentedTabs } from '@/components/admin/ui';
import { get } from '@/lib/client-api';
import { measure, money, STATUS_FLOW, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { QuoteList, QuoteStatus } from '@/lib/types';

type Filter = 'ALL' | 'ACTIVE' | QuoteStatus;

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function QuotesList() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Filter>((params.get('estado') as Filter) || 'ALL');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());

  useEffect(() => {
    router.replace(status === 'ALL' ? '/admin/pedidos' : `/admin/pedidos?estado=${status}`, { scroll: false });
  }, [status, router]);

  const query = useInfiniteQuery({
    queryKey: ['quotes', status, q],
    queryFn: ({ pageParam }) => get<QuoteList>(`/admin/quotes?page=${pageParam}&pageSize=30${status !== 'ALL' ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    refetchInterval: 60_000,
  });
  const first = query.data?.pages[0];
  const by = first?.byStatus ?? {};
  const all = Object.values(by).reduce((a, b) => a + (b ?? 0), 0);
  const active = (['QUOTED', 'APPROVED', 'IN_PRODUCTION', 'READY'] as QuoteStatus[]).reduce((a, s) => a + (by[s] ?? 0), 0);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const options: { value: Filter; label: string; count?: number }[] = [
    { value: 'ALL', label: 'Todos', count: all },
    { value: 'NEW', label: 'Nuevos', count: by.NEW ?? 0 },
    { value: 'ACTIVE', label: 'En curso', count: active },
    ...[...STATUS_FLOW.slice(1), 'CANCELLED' as QuoteStatus].map((s) => ({ value: s, label: STATUS_LABEL[s], count: by[s] ?? 0 })),
  ];

  return (
    <>
      <PageHeader title="Pedidos" text="Presupuestos y consultas que llegan desde la web. Tocá uno para responder por WhatsApp y cambiar el estado." />
      <div className="space-y-3">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <span className="sr-only">Buscar pedidos</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por nombre, teléfono, código o trabajo" className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[0.95rem] outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
        </label>
        <SegmentedTabs value={status} onChange={setStatus} options={options} className="-mx-4 px-4 sm:mx-0 sm:px-0" />
      </div>

      <div className="mt-5">
        {query.isLoading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title={q || status !== 'ALL' ? 'No hay pedidos con ese filtro' : 'Todavía no llegaron pedidos'} text="Cuando alguien arme un presupuesto o mande una consulta en la web, aparece acá al instante." />
        ) : (
          <ul className="space-y-2">
            {items.map((x) => (
              <li key={x.id}>
                <Link href={`/admin/pedidos/${x.id}`} className="flex gap-3 rounded-md bg-white p-3.5 ring-1 ring-black/8 transition-shadow hover:shadow-md sm:items-center sm:p-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold">{x.customerName}</span>
                      <StatusBadge status={x.status} />
                      {x.kind === 'CONTACT' && <span className="text-xs font-semibold text-slate">Consulta</span>}
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink/80">
                      {x.productName ?? (x.kind === 'CONTACT' ? (x.message ?? '').slice(0, 80) : 'Sin servicio elegido')}
                      {measure(x.width, x.height) ? `, ${measure(x.width, x.height)}` : ''}
                      {x.kind === 'QUOTE' && x.quantity > 1 ? `, ${x.quantity} u.` : ''}
                    </span>
                    <span className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
                      <span>{x.code}</span>
                      <span>{timeAgo(x.createdAt)}</span>
                      {x.city && <span>{x.city}</span>}
                      {(x.fileCount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" /> {x.fileCount}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-right text-sm">
                    {x.quotedPrice ? <span className="font-extrabold">{money(x.quotedPrice)}</span> : x.estimate ? <span className="text-slate">est. {money(x.estimate)}</span> : null}
                  </span>
                </Link>
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

export default function QuotesPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <QuotesList />
    </Suspense>
  );
}
