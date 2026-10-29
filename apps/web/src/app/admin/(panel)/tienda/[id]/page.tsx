'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SingleImageField } from '@/components/admin/media';
import { Card, DeleteButton, Field, Input, LoadingBlock, MoneyInput, PageHeader, SaveBar, Select, Switch, Textarea } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import { formatDateTime, money } from '@/lib/format';
import type { Media, StoreAdminProduct, StoreCategory } from '@/lib/types';

type Form = {
  name: string;
  categoryId: string;
  subcategory: string;
  brand: string;
  sku: string;
  description: string;
  price: number | null;
  unit: string;
  inStock: boolean;
  featured: boolean;
  active: boolean;
  image: Media | null;
};

const empty = (categoryId = ''): Form => ({ name: '', categoryId, subcategory: '', brand: '', sku: '', description: '', price: null, unit: 'unidad', inStock: true, featured: false, active: true, image: null });
const fromProduct = (p: StoreAdminProduct): Form => ({
  name: p.name,
  categoryId: p.categoryId,
  subcategory: p.subcategory ?? '',
  brand: p.brand ?? '',
  sku: p.sku ?? '',
  description: p.description ?? '',
  price: p.price,
  unit: p.unit,
  inStock: p.inStock,
  featured: p.featured,
  active: p.active,
  image: p.image,
});

export default function StoreProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const router = useRouter();
  const cats = useAdminQuery<StoreCategory[]>(['store-categories'], '/admin/store/categories');
  const product = useAdminQuery<StoreAdminProduct>(['store-product', id], `/admin/store/products/${id}`, { enabled: !isNew });
  const [base, setBase] = useState<Form | null>(null);
  const [f, setF] = useState<Form | null>(null);

  useEffect(() => {
    if (isNew && cats.data && !f) {
      const e = empty(cats.data[0]?.id);
      setBase(e);
      setF(e);
    }
  }, [isNew, cats.data, f]);
  useEffect(() => {
    if (product.data) {
      const x = fromProduct(product.data);
      setBase(x);
      setF(x);
    }
  }, [product.data]);

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(base), [f, base]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => (s ? { ...s, [k]: v } : s));

  const body = (x: Form) => ({
    name: x.name.trim(),
    categoryId: x.categoryId,
    subcategory: x.subcategory.trim() || null,
    brand: x.brand.trim() || null,
    sku: x.sku.trim() || null,
    description: x.description.trim() || null,
    price: x.price,
    unit: x.unit.trim() || 'unidad',
    inStock: x.inStock,
    featured: x.featured,
    active: x.active,
    imageId: x.image?.id ?? null,
  });

  const save = useAdminMutation<Form, StoreAdminProduct>({
    method: isNew ? 'POST' : 'PATCH',
    path: isNew ? '/admin/store/products' : `/admin/store/products/${id}`,
    body,
    invalidate: [['store-products'], ['store-product', id], ['store-summary']],
    success: isNew ? 'Producto creado' : 'Cambios guardados',
    onSuccess: (res) => {
      if (isNew) router.replace(`/admin/tienda/${res.id}`);
      else setBase(f);
    },
  });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/store/products/${id}`, invalidate: [['store-products'], ['store-summary']], success: 'Producto eliminado', onSuccess: () => router.replace('/admin/tienda') });

  if (!f || cats.isLoading || (!isNew && product.isLoading)) return <LoadingBlock />;
  const p = product.data;
  const canSave = f.name.trim().length >= 2 && !!f.categoryId;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/tienda" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">
            <ChevronLeft className="size-4" /> Tienda
          </Link>
        }
        title={isNew ? 'Nuevo producto' : f.name || 'Producto'}
        actions={
          !isNew &&
          p && (
            <a href={`/tienda/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold hover:bg-black/5">
              Ver en la tienda <ExternalLink className="size-4" />
            </a>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 pb-24 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card title="Producto">
            <div className="space-y-4">
              <Field label="Nombre">
                <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Vinilo de corte negro mate 61 cm" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría">
                  <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    {(cats.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tipo" optional hint="Filtro dentro de la categoría: «Microperforados», «Papel para sublimar»">
                  <Input value={f.subcategory} onChange={(e) => set('subcategory', e.target.value)} />
                </Field>
                <Field label="Marca" optional>
                  <Input value={f.brand} onChange={(e) => set('brand', e.target.value)} />
                </Field>
                <Field label="Código" optional>
                  <Input value={f.sku} onChange={(e) => set('sku', e.target.value)} />
                </Field>
              </div>
              <Field label="Descripción" optional hint="Medidas, rendimiento, para qué sirve">
                <Textarea rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <SingleImageField label="Foto" value={f.image} onChange={(m) => set('image', m)} />
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Precio y stock">
            <div className="space-y-4">
              <Field label="Precio final" hint={p?.referencePrice != null ? `Lista del proveedor: ${money(p.referencePrice)}${p.syncedAt ? ` (al ${formatDateTime(p.syncedAt)})` : ''}` : 'Vacío = «Consultar precio»'}>
                <MoneyInput value={f.price} onChange={(v) => set('price', v)} placeholder="Consultar" />
              </Field>
              <Field label="Se vende por" hint="unidad, metro, rollo, kit…">
                <Input value={f.unit} onChange={(e) => set('unit', e.target.value)} />
              </Field>
              <Switch checked={f.inStock} onChange={(v) => set('inStock', v)} label="Hay stock" hint="Sin stock se muestra igual, con «Consultar disponibilidad»" />
              <Switch checked={f.featured} onChange={(v) => set('featured', v)} label="Destacado" hint="Aparece primero y en «Los más elegidos» de la portada" />
              <Switch checked={f.active} onChange={(v) => set('active', v)} label="Visible en la tienda" />
            </div>
          </Card>
          {!isNew && p && (
            <Card title="Datos">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate">Vistas</dt>
                  <dd className="tabular font-bold">{p.views}</dd>
                </div>
                <div>
                  <dt className="text-slate">Unidades pedidas</dt>
                  <dd className="tabular font-bold">{p.ordered}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate">Origen</dt>
                  <dd className="font-bold">{p.source === 'proveedor' ? 'Catálogo del proveedor (se actualizan lista y stock)' : 'Cargado a mano'}</dd>
                </div>
              </dl>
              <div className="mt-5 flex justify-end">
                <DeleteButton label="Eliminar producto" onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty || isNew} saving={save.isPending} onSave={() => canSave && save.mutate(f)} onReset={isNew ? undefined : () => setF(base)} label={isNew ? 'Crear producto' : 'Guardar cambios'} />
    </>
  );
}
