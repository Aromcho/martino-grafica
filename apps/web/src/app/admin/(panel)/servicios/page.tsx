'use client';

import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SortableList } from '@/components/admin/sortable';
import { Badge, EmptyState, LoadingBlock, PageHeader, SegmentedTabs } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import { normalize, priceLine } from '@/lib/format';
import type { Category, Product } from '@/lib/types';

export default function ProductsPage() {
  const products = useAdminQuery<Product[]>(['admin-products'], '/admin/products');
  const cats = useAdminQuery<Category[]>(['admin-categories'], '/admin/categories');
  const [cat, setCat] = useState('ALL');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Product[]>([]);

  const filtered = useMemo(() => {
    const list = products.data ?? [];
    const t = normalize(q);
    return list.filter((p) => (cat === 'ALL' || p.categoryId === cat) && (!t || normalize(`${p.name} ${p.summary ?? ''}`).includes(t)));
  }, [products.data, cat, q]);
  useEffect(() => setItems(filtered), [filtered]);

  const reorder = useAdminMutation<string[]>({ method: 'PUT', path: '/admin/products/order', body: (ids) => ({ ids }), invalidate: [['admin-products']], success: 'Orden guardado' });
  const canSort = cat !== 'ALL' && !q;

  if (products.isLoading || cats.isLoading) return <LoadingBlock />;
  const options = [{ value: 'ALL', label: 'Todos', count: products.data?.length ?? 0 }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.shortName ?? c.name, count: (products.data ?? []).filter((p) => p.categoryId === c.id).length }))];

  return (
    <>
      <PageHeader
        title="Servicios"
        text="Lo que ofrece el taller, con fotos, precios publicados y opciones para el cotizador."
        actions={
          <Link href="/admin/servicios/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-white hover:bg-steel">
            <Plus className="size-4" /> Nuevo servicio
          </Link>
        }
      />
      <div className="space-y-3">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <span className="sr-only">Buscar servicios</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar servicio" className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[0.95rem] outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
        </label>
        <SegmentedTabs value={cat} onChange={setCat} options={options} className="-mx-4 px-4 sm:mx-0 sm:px-0" />
      </div>
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState title="No hay servicios con ese filtro" />
        ) : (
          <SortableList
            items={items}
            disabled={!canSort}
            onChange={(next) => {
              setItems(next);
              reorder.mutate(next.map((p) => p.id));
            }}
            className="space-y-2"
            render={(p, handle) => (
              <div className="flex items-center gap-3 rounded-md bg-white p-2.5 pr-3 ring-1 ring-black/8">
                {handle}
                <Img media={p.cover ?? p.images[0]} ratio="1/1" sizes="56px" className="w-14 shrink-0 rounded" />
                <Link href={`/admin/servicios/${p.id}`} className="min-w-0 flex-1 py-1">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="block truncate text-sm text-slate">
                    {p.category?.name} · {priceLine(p)}
                  </span>
                </Link>
                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {p.featured && <Badge tone="lime">Destacado</Badge>}
                  {!p.active && <Badge tone="red">Oculto</Badge>}
                </span>
              </div>
            )}
          />
        )}
        <p className="mt-3 text-xs text-slate">{canSort ? 'Arrastrá desde la manija para ordenar este rubro.' : 'Elegí un rubro para ordenar sus servicios arrastrando.'}</p>
      </div>
    </>
  );
}
