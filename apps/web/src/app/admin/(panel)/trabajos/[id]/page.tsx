'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImagesField } from '@/components/admin/media';
import { Card, DeleteButton, Field, Input, LinesInput, LoadingBlock, PageHeader, SaveBar, Select, Switch, Textarea } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import type { Category, Media, Product, WorkDetail, WorkFacets } from '@/lib/types';

type Form = {
  title: string;
  categoryId: string;
  productId: string;
  client: string;
  location: string;
  doneAt: string;
  summary: string;
  description: string;
  materials: string[];
  instagramCode: string;
  featured: boolean;
  active: boolean;
  images: Media[];
};

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export default function WorkEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const router = useRouter();
  const cats = useAdminQuery<Category[]>(['admin-categories'], '/admin/categories');
  const products = useAdminQuery<Product[]>(['admin-products'], '/admin/products');
  const facets = useAdminQuery<WorkFacets>(['work-facets'], '/works/facets');
  const work = useAdminQuery<WorkDetail>(['admin-work', id], `/admin/works/${id}`, { enabled: !isNew });
  const [base, setBase] = useState<Form | null>(null);
  const [f, setF] = useState<Form | null>(null);

  useEffect(() => {
    if (isNew && cats.data && !f) {
      const e: Form = { title: '', categoryId: cats.data[0]?.id ?? '', productId: '', client: '', location: 'Villa Gesell', doneAt: today(), summary: '', description: '', materials: [], instagramCode: '', featured: false, active: true, images: [] };
      setBase(e);
      setF(e);
    }
  }, [isNew, cats.data, f]);
  useEffect(() => {
    const w = work.data;
    if (!w) return;
    const x: Form = {
      title: w.title,
      categoryId: w.categoryId,
      productId: w.productId ?? '',
      client: w.client ?? '',
      location: w.location ?? '',
      doneAt: w.doneAt?.slice(0, 10) ?? '',
      summary: w.summary ?? '',
      description: w.description ?? '',
      materials: w.materials ?? [],
      instagramCode: w.instagramCode ?? '',
      featured: w.featured,
      active: w.active,
      images: w.images ?? [],
    };
    setBase(x);
    setF(x);
  }, [work.data]);

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(base), [f, base]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => (s ? { ...s, [k]: v } : s));
  const catProducts = (products.data ?? []).filter((p) => p.categoryId === f?.categoryId);

  const save = useAdminMutation<Form, WorkDetail>({
    method: isNew ? 'POST' : 'PATCH',
    path: isNew ? '/admin/works' : `/admin/works/${id}`,
    body: (x) => ({
      title: x.title.trim(),
      categoryId: x.categoryId,
      productId: x.productId || null,
      client: x.client.trim() || null,
      location: x.location.trim() || null,
      doneAt: x.doneAt || null,
      summary: x.summary.trim() || null,
      description: x.description.trim() || null,
      materials: x.materials,
      instagramCode: x.instagramCode.trim().replace(/^https?:\/\/(www\.)?instagram\.com\/(p|reel)\//, '').replace(/\/.*$/, '') || null,
      featured: x.featured,
      active: x.active,
      imageIds: x.images.map((m) => m.id),
      coverId: x.images[0]?.id ?? null,
    }),
    invalidate: [['admin-works'], ['admin-work', id]],
    success: isNew ? 'Trabajo publicado' : 'Cambios guardados',
    onSuccess: (res) => {
      if (isNew) router.replace(`/admin/trabajos/${res.id}`);
      else setBase(f);
    },
  });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/works/${id}`, invalidate: [['admin-works']], success: 'Trabajo eliminado', onSuccess: () => router.replace('/admin/trabajos') });

  if (!f || cats.isLoading || (!isNew && work.isLoading)) return <LoadingBlock />;
  const canSave = f.title.trim().length >= 2 && !!f.categoryId;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/trabajos" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">
            <ChevronLeft className="size-4" /> Trabajos
          </Link>
        }
        title={isNew ? 'Cargar trabajo' : f.title || 'Trabajo'}
        text={isNew ? 'Subí las fotos, poné un título y elegí el rubro. Lo demás es opcional.' : undefined}
        actions={
          !isNew &&
          work.data && (
            <a href={`/trabajos/${work.data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold hover:bg-black/5">
              Ver en la web <ExternalLink className="size-4" />
            </a>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <ImagesField value={f.images} onChange={(v) => set('images', v)} max={60} />
          </Card>
          <Card title="Datos del trabajo">
            <div className="space-y-4">
              <Field label="Título" hint="Qué se hizo y para quién: «Ploteo de una Fiorino para Panadería X»">
                <Input value={f.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
              <Field label="Resumen" optional hint="Una línea que se ve en la ficha">
                <Textarea rows={2} maxLength={300} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
              </Field>
              <Field label="Descripción" optional>
                <Textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <Field label="Materiales y terminaciones" hint="Uno por renglón">
                <LinesInput value={f.materials} onChange={(v) => set('materials', v)} placeholder={'Vinilo impreso\nLaminado'} rows={3} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Publicación">
            <Switch label="Visible en la web" checked={f.active} onChange={(v) => set('active', v)} />
            <Switch label="Destacado en el inicio" checked={f.featured} onChange={(v) => set('featured', v)} />
          </Card>
          <Card title="Clasificación">
            <div className="space-y-4">
              <Field label="Rubro">
                <Select value={f.categoryId} onChange={(e) => setF((s) => (s ? { ...s, categoryId: e.target.value, productId: '' } : s))}>
                  {(cats.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Servicio" optional hint="Para el botón «Pedí uno así»">
                <Select value={f.productId} onChange={(e) => set('productId', e.target.value)}>
                  <option value="">Sin servicio</option>
                  {catProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cliente" optional>
                <Input value={f.client} onChange={(e) => set('client', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lugar" optional>
                  <Input list="locations" value={f.location} onChange={(e) => set('location', e.target.value)} />
                  <datalist id="locations">
                    {(facets.data?.locations ?? []).map((l) => (
                      <option key={l.location} value={l.location} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Fecha">
                  <Input type="date" value={f.doneAt} onChange={(e) => set('doneAt', e.target.value)} />
                </Field>
              </div>
              <Field label="Publicación de Instagram" optional hint="Pegá el link del post o reel">
                <Input value={f.instagramCode} onChange={(e) => set('instagramCode', e.target.value)} placeholder="https://www.instagram.com/p/…" />
              </Field>
            </div>
          </Card>
          {!isNew && (
            <div className="flex justify-end">
              <DeleteButton label="Eliminar trabajo" onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />
            </div>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty && canSave} saving={save.isPending} onSave={() => save.mutate(f)} onReset={isNew ? undefined : () => setF(base)} label={isNew ? 'Publicar trabajo' : 'Guardar cambios'} />
    </>
  );
}
