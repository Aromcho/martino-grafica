'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Btn, EmptyState, LoadingBlock, MoneyInput, PageHeader, SegmentedTabs, Select } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { Paginated, StoreAdminProduct, StoreCategory, StoreSummary } from '@/lib/types';

type Status = 'ALL' | 'hidden' | 'nostock' | 'noprice' | 'custom' | 'featured';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Precio editable en el renglón: guarda al salir del campo o con Enter */
function InlinePrice({ p }: { p: StoreAdminProduct }) {
  const [v, setV] = useState<number | null>(p.price);
  useEffect(() => setV(p.price), [p.price]);
  const save = useAdminMutation<{ price: number | null }>({ method: 'PATCH', path: `/admin/store/products/${p.id}`, invalidate: [['store-products'], ['store-summary']], success: 'Precio guardado' });
  const commit = () => v !== p.price && save.mutate({ price: v });
  return (
    <div className="w-32" onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).blur()}>
      <MoneyInput value={v} onChange={setV} placeholder="Consultar" />
    </div>
  );
}

export default function StoreAdminPage() {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState<Status>('ALL');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    setPage(1);
    setSel(new Set());
  }, [q, cat, status]);

  const params = new URLSearchParams({ page: String(page), pageSize: '50', sort: 'nombre' });
  if (q) params.set('q', q);
  if (cat) params.set('category', cat);
  if (status !== 'ALL') params.set('status', status);
  const list = useAdminQuery<Paginated<StoreAdminProduct>>(['store-products', q, cat, status, page], `/admin/store/products?${params}`);
  const summary = useAdminQuery<StoreSummary>(['store-summary'], '/admin/store/summary');
  const cats = useAdminQuery<StoreCategory[]>(['store-categories'], '/admin/store/categories');

  const bulk = useAdminMutation<{ ids: string[]; active?: boolean; featured?: boolean; inStock?: boolean }, { label: string }>({
    method: 'PATCH',
    path: '/admin/store/products/bulk',
    invalidate: [['store-products'], ['store-summary']],
    success: (r) => `Listo: ${r.label}`,
    onSuccess: () => setSel(new Set()),
  });
  const toggle = useAdminMutation<{ id: string; active?: boolean; featured?: boolean }>({
    method: 'PATCH',
    path: (v) => `/admin/store/products/${v.id}`,
    body: ({ id: _id, ...rest }) => rest,
    invalidate: [['store-products'], ['store-summary']],
    success: false,
  });

  if (summary.isLoading || cats.isLoading) return <LoadingBlock />;
  const s = summary.data;
  const items = list.data?.items ?? [];
  const ids = [...sel];
  const allOnPage = items.length > 0 && items.every((p) => sel.has(p.id));

  return (
    <>
      <PageHeader
        title="Tienda"
        text={s ? `${s.total.toLocaleString('es-AR')} productos · ${s.hidden} ocultos · ${s.noStock} sin stock · ${s.custom} con precio propio` : undefined}
        actions={
          <Link href="/admin/tienda/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-white hover:bg-steel">
            <Plus className="size-4" /> Nuevo producto
          </Link>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <label className="relative block min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
            <span className="sr-only">Buscar productos</span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por nombre, marca o código" className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[0.95rem] outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
          </label>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto min-w-44" aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </Select>
        </div>
        <SegmentedTabs<Status>
          value={status}
          onChange={setStatus}
          className="-mx-4 px-4 sm:mx-0 sm:px-0"
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'featured', label: 'Destacados' },
            { value: 'hidden', label: 'Ocultos', count: s?.hidden },
            { value: 'nostock', label: 'Sin stock', count: s?.noStock },
            { value: 'noprice', label: 'Sin precio', count: s?.noPrice },
            { value: 'custom', label: 'Precio propio', count: s?.custom },
          ]}
        />
      </div>

      {sel.size > 0 && (
        <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-ink p-2.5 text-white shadow-lg">
          <span className="tabular px-2 text-sm font-bold">{sel.size} elegidos</span>
          <Btn size="sm" variant="lime" onClick={() => bulk.mutate({ ids, active: true })}>
            Mostrar
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk.mutate({ ids, active: false })}>
            Ocultar
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk.mutate({ ids, featured: true })}>
            Destacar
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk.mutate({ ids, featured: false })}>
            Quitar destacado
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk.mutate({ ids, inStock: false })}>
            Sin stock
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk.mutate({ ids, inStock: true })}>
            Con stock
          </Btn>
          <button type="button" onClick={() => setSel(new Set())} className="ml-auto px-2 text-sm font-semibold text-white/70 hover:text-white">
            Cancelar
          </button>
        </div>
      )}

      <div className="mt-4">
        {list.isLoading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title={s?.total ? 'No hay productos con ese filtro' : 'Todavía no hay productos'} text={s?.total ? undefined : 'Cargá el primero con «Nuevo producto».'} />
        ) : (
          <>
            <label className="mb-2 inline-flex items-center gap-2 px-1 text-sm font-semibold text-slate">
              <input type="checkbox" checked={allOnPage} onChange={(e) => setSel(e.target.checked ? new Set([...sel, ...items.map((p) => p.id)]) : new Set())} className="size-4 accent-ink" />
              Elegir los {items.length} de esta página
            </label>
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className={cn('flex flex-wrap items-center gap-3 rounded-md bg-white p-2.5 pr-3 ring-1 ring-black/8 sm:flex-nowrap', !p.active && 'opacity-60')}>
                  <input
                    type="checkbox"
                    checked={sel.has(p.id)}
                    onChange={(e) => {
                      const next = new Set(sel);
                      if (e.target.checked) next.add(p.id);
                      else next.delete(p.id);
                      setSel(next);
                    }}
                    className="size-4 shrink-0 accent-ink"
                    aria-label={`Elegir ${p.name}`}
                  />
                  <Img media={p.image} ratio="1/1" fit="contain" sizes="56px" className="w-14 shrink-0 rounded !bg-white ring-1 ring-black/5" />
                  <Link href={`/admin/tienda/${p.id}`} className="min-w-0 flex-1 basis-48 py-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block truncate text-sm text-slate">
                      {p.category?.name}
                      {p.subcategory ? ` · ${p.subcategory}` : ''}
                      {p.referencePrice != null && p.referencePrice !== p.price ? ` · lista ${money(p.referencePrice)}` : ''}
                    </span>
                  </Link>
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {!p.inStock && <Badge tone="warn">Sin stock</Badge>}
                    {!p.active && <Badge tone="red">Oculto</Badge>}
                    <button
                      type="button"
                      onClick={() => toggle.mutate({ id: p.id, featured: !p.featured })}
                      className={cn('grid size-9 place-items-center rounded-md', p.featured ? 'bg-lime text-ink' : 'text-slate hover:bg-black/5')}
                      aria-label={p.featured ? 'Quitar de destacados' : 'Destacar'}
                      aria-pressed={p.featured}
                    >
                      <Star className="size-4" fill={p.featured ? 'currentColor' : 'none'} />
                    </button>
                  </span>
                  <InlinePrice p={p} />
                </li>
              ))}
            </ul>
            {list.data && list.data.pages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <Btn size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Página anterior">
                  <ChevronLeft className="size-4" />
                </Btn>
                <span className="tabular text-sm font-semibold">
                  {page} de {list.data.pages} · {list.data.total.toLocaleString('es-AR')} productos
                </span>
                <Btn size="sm" variant="outline" disabled={page >= list.data.pages} onClick={() => setPage(page + 1)} aria-label="Página siguiente">
                  <ChevronRight className="size-4" />
                </Btn>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
