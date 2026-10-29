'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SingleImageField } from '@/components/admin/media';
import { SortableList } from '@/components/admin/sortable';
import { Badge, Btn, DeleteButton, EditorDrawer, Field, Input, LoadingBlock, PageHeader, Switch, Textarea } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import type { Media, StoreCategory } from '@/lib/types';

type Form = { id?: string; name: string; tagline: string; description: string; active: boolean; cover: Media | null };
const blank: Form = { name: '', tagline: '', description: '', active: true, cover: null };

export default function StoreCategoriesPage() {
  const cats = useAdminQuery<StoreCategory[]>(['store-categories'], '/admin/store/categories');
  const [items, setItems] = useState<StoreCategory[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  useEffect(() => setItems(cats.data ?? []), [cats.data]);

  const inv = [['store-categories'], ['store-summary']];
  const reorder = useAdminMutation<string[]>({ method: 'PUT', path: '/admin/store/categories/order', body: (ids) => ({ ids }), invalidate: inv, success: 'Orden guardado' });
  const save = useAdminMutation<Form>({
    method: form?.id ? 'PATCH' : 'POST',
    path: form?.id ? `/admin/store/categories/${form.id}` : '/admin/store/categories',
    body: (f) => ({ name: f.name.trim(), tagline: f.tagline.trim() || null, description: f.description.trim() || null, active: f.active, coverId: f.cover?.id ?? null }),
    invalidate: inv,
    success: 'Categoría guardada',
    onSuccess: () => setForm(null),
  });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/store/categories/${form?.id}`, invalidate: inv, success: 'Categoría eliminada', onSuccess: () => setForm(null) });

  if (cats.isLoading) return <LoadingBlock />;
  const current = cats.data?.find((c) => c.id === form?.id);

  return (
    <>
      <PageHeader
        title="Categorías de la tienda"
        text="El orden de acá es el de la tienda y la portada. Sin foto propia, se usa la de un producto destacado."
        actions={
          <Btn onClick={() => setForm(blank)}>
            <Plus className="size-4" /> Nueva categoría
          </Btn>
        }
      />
      <SortableList
        items={items}
        onChange={(next) => {
          setItems(next);
          reorder.mutate(next.map((c) => c.id));
        }}
        className="space-y-2"
        render={(c, handle) => (
          <div className="flex items-center gap-3 rounded-md bg-white p-2.5 pr-3 ring-1 ring-black/8">
            {handle}
            <Img media={c.cover} ratio="1/1" fit="contain" sizes="56px" className="w-14 shrink-0 rounded !bg-white ring-1 ring-black/5" />
            <button type="button" onClick={() => setForm({ id: c.id, name: c.name, tagline: c.tagline ?? '', description: c.description ?? '', active: c.active, cover: c.coverId ? c.cover : null })} className="min-w-0 flex-1 py-1 text-left">
              <span className="block truncate font-bold">{c.name}</span>
              <span className="block truncate text-sm text-slate">
                {c.productCount} productos{c.tagline ? ` · ${c.tagline}` : ''}
              </span>
            </button>
            {!c.active && <Badge tone="red">Oculta</Badge>}
          </div>
        )}
      />

      <EditorDrawer
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <div className="flex items-center gap-3">
            {form?.id && (current?.productCount ?? 0) === 0 && <DeleteButton compact onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />}
            <Btn className="ml-auto" disabled={!form || form.name.trim().length < 2 || save.isPending} onClick={() => form && save.mutate(form)}>
              Guardar
            </Btn>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Bajada" hint="Una línea: se ve en la portada y arriba de la categoría">
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={160} />
            </Field>
            <Field label="Descripción" optional>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <SingleImageField label="Foto propia (opcional)" value={form.cover} onChange={(m) => setForm({ ...form, cover: m })} />
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Visible en la tienda" />
          </div>
        )}
      </EditorDrawer>
    </>
  );
}
