'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ExternalLink, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImagesField } from '@/components/admin/media';
import { Btn, Card, DeleteButton, Field, Input, LinesInput, LoadingBlock, MoneyInput, PageHeader, SaveBar, Select, Switch, Textarea } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import type { Category, Media, PriceTier, Product, QuoteMode, SizeOption } from '@/lib/types';

type Form = {
  name: string;
  categoryId: string;
  summary: string;
  description: string;
  quoteMode: QuoteMode;
  unit: string;
  priceFrom: number | null;
  priceTiers: PriceTier[];
  priceNote: string;
  minQty: number;
  leadTime: string;
  materials: string[];
  finishes: string[];
  features: string[];
  sizes: SizeOption[];
  specs: [string, string][];
  featured: boolean;
  active: boolean;
  images: Media[];
};

const empty = (categoryId = ''): Form => ({
  name: '',
  categoryId,
  summary: '',
  description: '',
  quoteMode: 'AREA',
  unit: 'unidad',
  priceFrom: null,
  priceTiers: [],
  priceNote: '',
  minQty: 1,
  leadTime: '',
  materials: [],
  finishes: [],
  features: [],
  sizes: [],
  specs: [],
  featured: false,
  active: true,
  images: [],
});

const fromProduct = (p: Product): Form => ({
  name: p.name,
  categoryId: p.categoryId,
  summary: p.summary ?? '',
  description: p.description ?? '',
  quoteMode: p.quoteMode,
  unit: p.unit,
  priceFrom: p.priceFrom,
  priceTiers: p.priceTiers ?? [],
  priceNote: p.priceNote ?? '',
  minQty: p.minQty ?? 1,
  leadTime: p.leadTime ?? '',
  materials: p.materials ?? [],
  finishes: p.finishes ?? [],
  features: p.features ?? [],
  sizes: p.sizes ?? [],
  specs: Object.entries(p.specs ?? {}),
  featured: p.featured,
  active: p.active,
  images: p.images ?? [],
});

const MODES: { value: QuoteMode; label: string; hint: string }[] = [
  { value: 'AREA', label: 'Por medida', hint: 'El cotizador pide ancho y alto (carteles, vidrieras, vinilos)' },
  { value: 'UNITS', label: 'Por cantidad', hint: 'Pide cantidad y talle o tamaño (remeras, calcos, tarjetas)' },
  { value: 'CUSTOM', label: 'A medida', hint: 'Pide una descripción (vehículos, motos, diseño)' },
];

export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const router = useRouter();
  const cats = useAdminQuery<Category[]>(['admin-categories'], '/admin/categories');
  const product = useAdminQuery<Product>(['admin-product', id], `/admin/products/${id}`, { enabled: !isNew });
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
    summary: x.summary.trim() || null,
    description: x.description.trim() || null,
    quoteMode: x.quoteMode,
    unit: x.unit.trim() || 'unidad',
    priceFrom: x.priceFrom,
    priceTiers: x.priceTiers.filter((t) => t.minQty > 0 && t.price > 0).map((t) => ({ minQty: t.minQty, price: t.price, ...(t.label ? { label: t.label } : {}) })),
    priceNote: x.priceNote.trim() || null,
    minQty: Math.max(1, x.minQty || 1),
    leadTime: x.leadTime.trim() || null,
    materials: x.materials,
    finishes: x.finishes,
    features: x.features,
    sizes: x.sizes.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), ...(s.width ? { width: s.width } : {}), ...(s.height ? { height: s.height } : {}) })),
    specs: Object.fromEntries(x.specs.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()])),
    featured: x.featured,
    active: x.active,
    imageIds: x.images.map((m) => m.id),
  });

  const save = useAdminMutation<Form, Product>({
    method: isNew ? 'POST' : 'PATCH',
    path: isNew ? '/admin/products' : `/admin/products/${id}`,
    body,
    invalidate: [['admin-products'], ['admin-product', id]],
    success: isNew ? 'Servicio creado' : 'Cambios guardados',
    onSuccess: (res) => {
      if (isNew) router.replace(`/admin/servicios/${res.id}`);
      else setBase(f);
    },
  });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/products/${id}`, invalidate: [['admin-products']], success: 'Servicio eliminado', onSuccess: () => router.replace('/admin/servicios') });

  if (!f || cats.isLoading || (!isNew && product.isLoading)) return <LoadingBlock />;
  const canSave = f.name.trim().length >= 2 && !!f.categoryId;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/servicios" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">
            <ChevronLeft className="size-4" /> Servicios
          </Link>
        }
        title={isNew ? 'Nuevo servicio' : f.name || 'Servicio'}
        actions={
          !isNew &&
          product.data && (
            <a href={`/servicios/${product.data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold hover:bg-black/5">
              Ver en la web <ExternalLink className="size-4" />
            </a>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card title="Lo básico">
            <div className="space-y-4">
              <Field label="Nombre">
                <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Cartel de lona front o back light" />
              </Field>
              <Field label="Rubro">
                <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  {(cats.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Resumen" hint="Una o dos líneas: se ve en la tarjeta del catálogo">
                <Textarea rows={2} maxLength={300} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
              </Field>
              <Field label="Descripción" optional>
                <Textarea rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <ImagesField value={f.images} onChange={(v) => set('images', v)} />
          </Card>

          <Card title="Opciones para el cotizador">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Materiales" hint="Uno por renglón">
                <LinesInput value={f.materials} onChange={(v) => set('materials', v)} placeholder={'Vinilo de corte\nVinilo impreso'} />
              </Field>
              <Field label="Terminaciones" hint="Uno por renglón">
                <LinesInput value={f.finishes} onChange={(v) => set('finishes', v)} placeholder={'Laminado mate\nLaqueado'} />
              </Field>
              <Field label="Características" hint="Se muestran con un tilde en la ficha" className="sm:col-span-2">
                <LinesInput value={f.features} onChange={(v) => set('features', v)} placeholder="Tu logo adelante y atrás" />
              </Field>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Talles o tamaños</span>
                <Btn size="sm" variant="ghost" onClick={() => set('sizes', [...f.sizes, { label: '' }])}>
                  <Plus className="size-4" /> Agregar
                </Btn>
              </div>
              {f.sizes.length === 0 && <p className="text-sm text-slate">Sin talles. Para remeras cargá S, M, L…; para carteles, medidas como «60 × 40 cm».</p>}
              <ul className="space-y-2">
                {f.sizes.map((s, i) => (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_auto] items-center gap-2">
                    <Input value={s.label} onChange={(e) => set('sizes', f.sizes.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} placeholder="Nombre (M, 60 × 40)" aria-label="Talle o tamaño" />
                    <Input inputMode="numeric" value={s.width ?? ''} onChange={(e) => set('sizes', f.sizes.map((x, k) => (k === i ? { ...x, width: Number(e.target.value) || undefined } : x)))} placeholder="Ancho" aria-label="Ancho en cm" />
                    <Input inputMode="numeric" value={s.height ?? ''} onChange={(e) => set('sizes', f.sizes.map((x, k) => (k === i ? { ...x, height: Number(e.target.value) || undefined } : x)))} placeholder="Alto" aria-label="Alto en cm" />
                    <button type="button" onClick={() => set('sizes', f.sizes.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-md text-slate hover:bg-black/5" aria-label="Quitar">
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Ficha técnica</span>
                <Btn size="sm" variant="ghost" onClick={() => set('specs', [...f.specs, ['', '']])}>
                  <Plus className="size-4" /> Agregar
                </Btn>
              </div>
              {f.specs.length === 0 && <p className="text-sm text-slate">Datos como «Tela: jersey peinado 24/1» o «Durabilidad: 5 años».</p>}
              <ul className="space-y-2">
                {f.specs.map(([k, v], i) => (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-2">
                    <Input value={k} onChange={(e) => set('specs', f.specs.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} placeholder="Dato" aria-label="Dato" />
                    <Input value={v} onChange={(e) => set('specs', f.specs.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} placeholder="Valor" aria-label="Valor" />
                    <button type="button" onClick={() => set('specs', f.specs.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-md text-slate hover:bg-black/5" aria-label="Quitar">
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Visibilidad">
            <Switch label="Visible en la web" checked={f.active} onChange={(v) => set('active', v)} />
            <Switch label="Destacado" hint="Aparece como acceso rápido en el inicio y el cotizador" checked={f.featured} onChange={(v) => set('featured', v)} />
          </Card>

          <Card title="Precio y cotización">
            <div className="space-y-4">
              <Field label="Cómo se cotiza" hint={MODES.find((m) => m.value === f.quoteMode)?.hint}>
                <Select value={f.quoteMode} onChange={(e) => set('quoteMode', e.target.value as QuoteMode)}>
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Se vende por" hint="unidad, m², juego, kit…">
                  <Input value={f.unit} onChange={(e) => set('unit', e.target.value)} />
                </Field>
                <Field label="Mínimo">
                  <Input inputMode="numeric" value={f.minQty} onChange={(e) => set('minQty', Number(e.target.value.replace(/\D/g, '')) || 1)} />
                </Field>
              </div>
              <Field label="Producción" optional hint="Ej.: 1 a 5 días (también en el día)">
                <Input value={f.leadTime} onChange={(e) => set('leadTime', e.target.value)} />
              </Field>
              <Field label="Precio desde" optional hint="Si lo dejás vacío, la web dice «Presupuesto según la medida»">
                <MoneyInput value={f.priceFrom} onChange={(v) => set('priceFrom', v)} />
              </Field>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Precios por cantidad</span>
                  <Btn size="sm" variant="ghost" onClick={() => set('priceTiers', [...f.priceTiers, { minQty: (f.priceTiers.at(-1)?.minQty ?? 0) + (f.priceTiers.length ? 5 : 1), price: 0 }])}>
                    <Plus className="size-4" /> Escala
                  </Btn>
                </div>
                {f.priceTiers.length === 0 ? (
                  <p className="text-sm text-slate">Con escalas, la ficha muestra la tabla y el cotizador calcula el estimado.</p>
                ) : (
                  <ul className="space-y-2">
                    {f.priceTiers.map((t, i) => (
                      <li key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2">
                        <Input inputMode="numeric" value={t.minQty} onChange={(e) => set('priceTiers', f.priceTiers.map((x, k) => (k === i ? { ...x, minQty: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} aria-label="Desde cantidad" />
                        <MoneyInput value={t.price || null} onChange={(v) => set('priceTiers', f.priceTiers.map((x, k) => (k === i ? { ...x, price: v ?? 0 } : x)))} />
                        <button type="button" onClick={() => set('priceTiers', f.priceTiers.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-md text-slate hover:bg-black/5" aria-label="Quitar escala">
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                    <li className="text-xs text-slate">Izquierda: desde cuántas unidades. Derecha: precio por unidad.</li>
                  </ul>
                )}
              </div>
              <Field label="Aclaración del precio" optional hint="Ej.: Precios de febrero de 2026">
                <Textarea rows={2} value={f.priceNote} onChange={(e) => set('priceNote', e.target.value)} />
              </Field>
            </div>
          </Card>

          {!isNew && (
            <div className="flex justify-end">
              <DeleteButton label="Eliminar servicio" onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />
            </div>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty && canSave} saving={save.isPending} onSave={() => save.mutate(f)} onReset={isNew ? undefined : () => setF(base)} label={isNew ? 'Crear servicio' : 'Guardar cambios'} />
    </>
  );
}
