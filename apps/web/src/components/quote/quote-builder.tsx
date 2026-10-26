'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import { DELIVERY_LABEL, measure, money, priceLine, tierFor } from '@/lib/format';
import type { Category, DeliveryMethod, Product } from '@/lib/types';
import { FileDrop, useFirstImage } from './file-drop';
import { SizePreview } from './size-preview';

type Result = { code: string; estimate: { unit: number; total: number } | null; whatsappUrl: string | null; message: string };
type Errors = Partial<Record<'product' | 'width' | 'height' | 'customerName' | 'phone' | 'email' | 'files' | 'form', string>>;

const OTHER = '__otro';
const PHONE_RE = /^[\d\s()+-]{8,24}$/;
const VEHICLE_CATS = ['ploteo-vehicular', 'motos-y-cuatris'];
const DELIVERIES: { v: DeliveryMethod; hint: string }[] = [
  { v: 'PICKUP', hint: 'Lo buscás por el taller' },
  { v: 'INSTALL', hint: 'Lo colocamos nosotros' },
  { v: 'SHIPPING', hint: 'Te lo mandamos' },
];

const field =
  'h-12 w-full rounded-lg bg-white px-3.5 text-[1rem] text-ink outline-none ring-1 ring-black/15 transition-shadow placeholder:text-slate/70 focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger';

function Step({ n, title, hint, children, id }: { n: number; title: string; hint?: string; children: ReactNode; id?: string }) {
  return (
    <fieldset id={id} className="relative min-w-0 rounded-md bg-white p-5 shadow-[0_1px_0_rgb(0_0_0/0.05),0_22px_44px_-34px_rgb(0_0_0/0.5)] ring-1 ring-black/5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3.5">
        <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-lime" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 className="text-[1.2rem] font-extrabold leading-tight text-ink [font-stretch:110%]">{title}</h2>
          {hint && <p className="mt-1 text-sm text-slate">{hint}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children} {optional && <span className="font-normal text-slate">(opcional)</span>}
    </label>
  );
}

function Err({ msg, id }: { msg?: string; id: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-danger" role="alert">
      {msg}
    </p>
  );
}

function Choice({ checked, onClick, children, className }: { checked: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        'relative rounded-lg px-3.5 py-3 text-left text-ink ring-1 transition-[box-shadow,background-color]',
        checked ? 'bg-lime/30 ring-2 ring-ink' : 'bg-white ring-black/15 hover:ring-black/35',
        className,
      )}
    >
      {children}
      {checked && (
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-ink text-lime" aria-hidden="true">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function send(fd: FormData, onProgress: (p: number) => void) {
  return new Promise<Result>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/quotes');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* sin cuerpo */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as Result);
      const raw = (data as { message?: string | string[] } | null)?.message;
      reject(new Error(xhr.status === 429 ? 'Mandaste varios pedidos seguidos. Esperá unos minutos o escribinos por WhatsApp.' : Array.isArray(raw) ? raw.join('. ') : raw || 'No pudimos enviar el pedido. Probá de nuevo.'));
    };
    xhr.onerror = () => reject(new Error('Sin conexión. Revisá internet y probá de nuevo.'));
    xhr.send(fd);
  });
}

export function QuoteBuilder({
  products,
  categories,
  initial,
  whatsapp,
}: {
  products: Product[];
  categories: Category[];
  initial: { servicio?: string; cantidad?: number; message?: string };
  whatsapp?: string | null;
}) {
  const start = products.find((p) => p.slug === initial.servicio);
  const cats = categories.filter((c) => products.some((p) => p.categoryId === c.id));
  const [cat, setCat] = useState<string>(start?.categoryId ?? (initial.servicio === OTHER ? OTHER : cats[0]?.id ?? OTHER));
  const [slug, setSlug] = useState<string>(start?.slug ?? '');
  const [other, setOther] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [qty, setQty] = useState(initial.cantidad && initial.cantidad > 0 ? initial.cantidad : (start?.minQty ?? 1));
  const [material, setMaterial] = useState('');
  const [finish, setFinish] = useState('');
  const [size, setSize] = useState('');
  const [needsDesign, setNeedsDesign] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [delivery, setDelivery] = useState<DeliveryMethod>('PICKUP');
  const [deadline, setDeadline] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState(initial.message ?? '');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const image = useFirstImage(files);

  const product = products.find((p) => p.slug === slug) ?? null;
  const isOther = cat === OTHER;
  const mode = isOther ? 'AREA' : (product?.quoteMode ?? 'CUSTOM');
  const catSlug = categories.find((c) => c.id === product?.categoryId)?.slug ?? '';
  const isVehicle = VEHICLE_CATS.includes(catSlug);
  const sizeOptions = product?.sizes ?? [];
  const sizesAreTalles = sizeOptions.length > 0 && sizeOptions.every((s) => !s.width);
  const showMeasure = isOther || mode === 'AREA' || (mode === 'UNITS' && sizeOptions.length === 0);
  const measureRequired = !isOther && mode === 'AREA';
  const w = Number(width.replace(',', '.'));
  const h = Number(height.replace(',', '.'));
  const tier = product?.priceTiers.length ? tierFor(product.priceTiers, qty) : undefined;
  const estimate = tier ? tier.price * qty : null;

  // Datos del cliente recordados en este navegador (comodidad, no es necesario)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mg-cliente') ?? 'null') as { name?: string; phone?: string; email?: string; city?: string } | null;
      if (saved) {
        setName((v) => v || saved.name || '');
        setPhone((v) => v || saved.phone || '');
        setEmail((v) => v || saved.email || '');
        setCity((v) => v || saved.city || '');
      }
    } catch {
      /* sin storage */
    }
  }, []);

  // Al cambiar de servicio, se limpian las opciones que no corresponden
  useEffect(() => {
    setMaterial('');
    setFinish('');
    setSize('');
    if (product && qty < product.minQty) setQty(product.minQty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const visible = useMemo(() => (isOther ? [] : products.filter((p) => p.categoryId === cat)), [products, cat, isOther]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!product && !(isOther && other.trim().length > 2)) e.product = isOther ? 'Contanos qué trabajo necesitás' : 'Elegí un servicio de la lista';
    if (measureRequired && !(w > 0)) e.width = 'Cargá el ancho en centímetros';
    if (measureRequired && !(h > 0)) e.height = 'Cargá el alto en centímetros';
    if (name.trim().length < 2) e.customerName = 'Contanos tu nombre';
    if (!PHONE_RE.test(phone.trim())) e.phone = 'Revisá el teléfono: con código de área, sólo números';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Revisá el email';
    return e;
  };

  // Los avisos de error se van apenas se corrige el dato
  useEffect(() => {
    setErrors((prev) => {
      const keys = Object.keys(prev) as (keyof Errors)[];
      if (!keys.length || prev.form) return prev;
      const now = validate();
      const next: Errors = {};
      for (const k of keys) if (now[k]) next[k] = now[k];
      return Object.keys(next).length === keys.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, other, width, height, name, phone, email, cat]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(first === 'product' ? 'paso-servicio' : `q-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (document.getElementById(`q-${first}`) as HTMLInputElement | null)?.focus({ preventScroll: true });
      return;
    }
    // Se abre la pestaña de WhatsApp en el mismo toque (si no, el navegador la bloquea)
    const win = typeof window !== 'undefined' && whatsapp ? window.open('', '_blank') : null;
    const fd = new FormData();
    const put = (k: string, v: string | number | boolean | null | undefined) => {
      if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
    };
    put('kind', 'QUOTE');
    put('customerName', name.trim());
    put('phone', phone.trim());
    put('email', email.trim());
    put('city', city.trim());
    put('productId', product?.id);
    put('productName', isOther ? other.trim() : product?.name);
    if (showMeasure && w > 0 && h > 0) {
      put('width', w);
      put('height', h);
    }
    put('quantity', qty);
    put('material', material);
    put('finish', finish);
    put('size', size.trim());
    put('needsDesign', needsDesign);
    put('delivery', delivery);
    put('deadline', deadline);
    put('message', message.trim());
    put('website', website);
    files.forEach((f) => fd.append('files', f));

    setSending(true);
    setProgress(0);
    try {
      const res = await send(fd, setProgress);
      try {
        localStorage.setItem('mg-cliente', JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), city: city.trim() }));
      } catch {
        /* sin storage */
      }
      setResult(res);
      if (win && res.whatsappUrl) win.location.href = res.whatsappUrl;
      else win?.close();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      win?.close();
      setErrors({ form: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-md bg-white p-6 text-ink shadow-[0_22px_44px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/5 sm:p-9" role="status">
        <span className="grid size-12 place-items-center rounded-full bg-lime" aria-hidden="true">
          <Check className="size-6" strokeWidth={3} />
        </span>
        <h2 className="display mt-5 text-[clamp(1.8rem,6vw,2.6rem)]">Pedido enviado</h2>
        <p className="mt-3 text-lg">
          Tu número de pedido es <strong className="tabular">{result.code}</strong>.
        </p>
        <p className="mt-2 text-slate">
          Lo recibimos con todos los datos{files.length ? ' y tus archivos' : ''}. Para que te respondamos más rápido, mandanos el mensaje por WhatsApp: ya está escrito.
        </p>
        {result.estimate && (
          <p className="tabular mt-4 rounded-md bg-liner px-4 py-3">
            Estimado según los precios publicados: <strong>{money(result.estimate.total)}</strong> ({money(result.estimate.unit)} c/u). El precio final te lo confirmamos.
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          {result.whatsappUrl && (
            <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('ink', 'lg', 'w-full sm:w-auto')}>
              <WhatsAppIcon className="size-5 text-lime" /> Abrir WhatsApp
            </a>
          )}
          <Link href="/trabajos" className={buttonClass('outline', 'lg', 'w-full text-ink sm:w-auto')}>
            Ver trabajos
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setFiles([]);
            setMessage('');
          }}
          className="mt-6 text-sm font-semibold underline underline-offset-4"
        >
          Hacer otro pedido
        </button>
      </motion.div>
    );
  }

  const label = isOther ? other || 'Tu trabajo' : (product?.name ?? 'Tu trabajo');
  const summary = [
    { k: 'Trabajo', v: isOther ? other : product?.name },
    { k: 'Medida', v: showMeasure ? measure(w, h) : '' },
    { k: sizesAreTalles ? 'Talles' : isVehicle ? 'Vehículo' : 'Tamaño', v: size },
    { k: 'Cantidad', v: String(qty) },
    { k: 'Material', v: material },
    { k: 'Terminación', v: finish },
    { k: 'Diseño', v: needsDesign ? 'Lo diseñan ustedes' : files.length ? `${files.length} archivo${files.length > 1 ? 's' : ''}` : 'Lo tengo' },
    { k: 'Entrega', v: DELIVERY_LABEL[delivery] },
  ].filter((r) => r.v);

  const Summary = (
    <div className="rounded-md bg-ink p-5 text-white sm:p-6">
      <p className="text-sm text-smoke">Tu pedido</p>
      <dl className="mt-3 space-y-2 text-[0.95rem]">
        {summary.map((r) => (
          <div key={r.k} className="flex justify-between gap-4">
            <dt className="text-smoke">{r.k}</dt>
            <dd className="min-w-0 truncate text-right font-semibold">{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-dashed border-white/20 pt-4" aria-live="polite">
        {estimate ? (
          <>
            <p className="text-sm text-smoke">Estimado con precios publicados</p>
            <p className="tabular text-3xl font-extrabold text-lime">{money(estimate)}</p>
            <p className="tabular text-sm text-smoke">
              {tier?.label?.includes('desde') ? 'desde ' : ''}
              {money(tier?.price)} c/u. Te confirmamos el precio final.
            </p>
          </>
        ) : (
          <p className="text-[0.95rem] text-white/85">Te pasamos el precio por WhatsApp. {product ? priceLine(product) + '.' : ''}</p>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0 space-y-5">
        {/* 1. Servicio */}
        <Step n={1} id="paso-servicio" title="¿Qué necesitás?" hint="Elegí el rubro y el trabajo. Si no está, elegí «Otro».">
          <div className="scroll-x -mx-5 gap-2 px-5 pb-1 sm:-mx-7 sm:px-7" role="radiogroup" aria-label="Rubro">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={cat === c.id}
                onClick={() => {
                  setCat(c.id);
                  const first = products.find((p) => p.categoryId === c.id);
                  if (product?.categoryId !== c.id && first && products.filter((p) => p.categoryId === c.id).length === 1) setSlug(first.slug);
                }}
                className={cn('h-10 shrink-0 rounded-md px-3.5 text-sm font-bold ring-1 transition-colors', cat === c.id ? 'bg-ink text-lime ring-ink' : 'text-ink ring-black/15 hover:ring-black/40')}
              >
                {c.shortName ?? c.name}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={isOther}
              onClick={() => {
                setCat(OTHER);
                setSlug('');
              }}
              className={cn('h-10 shrink-0 rounded-md px-3.5 text-sm font-bold ring-1 transition-colors', isOther ? 'bg-ink text-lime ring-ink' : 'text-ink ring-black/15 hover:ring-black/40')}
            >
              Otro
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cat} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="mt-4">
              {isOther ? (
                <div>
                  <Label htmlFor="q-product">¿Qué trabajo es?</Label>
                  <input id="q-product" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ej.: imán para heladera, ploteo de un tráiler" className={field} aria-invalid={Boolean(errors.product)} maxLength={120} />
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Servicio">
                  {visible.map((p) => (
                    <Choice key={p.id} checked={slug === p.slug} onClick={() => setSlug(p.slug)} className="flex items-center gap-3 py-2.5 pl-2.5">
                      <Img media={p.cover ?? p.images[0]} sizes="56px" className="size-14 shrink-0 rounded" />
                      <span className="min-w-0 pr-5">
                        <span className="block text-[0.95rem] font-bold leading-snug">{p.name}</span>
                        <span className="block text-[0.8rem] text-slate">{priceLine(p)}</span>
                      </span>
                    </Choice>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <Err id="q-product-err" msg={errors.product} />
        </Step>

        {/* 2. Medidas */}
        <Step
          n={2}
          title={showMeasure ? 'Medida y cantidad' : 'Cantidad y detalles'}
          hint={measureRequired ? 'En centímetros. Si no sabés la medida exacta, poné una aproximada.' : mode === 'CUSTOM' ? 'Contanos lo que puedas: lo terminamos de definir por WhatsApp.' : undefined}
        >
          {showMeasure && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="q-width" optional={!measureRequired}>
                    Ancho (cm)
                  </Label>
                  <input id="q-width" inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="120" className={cn(field, 'tabular')} aria-invalid={Boolean(errors.width)} aria-describedby="q-width-err" />
                  <Err id="q-width-err" msg={errors.width} />
                </div>
                <div>
                  <Label htmlFor="q-height" optional={!measureRequired}>
                    Alto (cm)
                  </Label>
                  <input id="q-height" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="60" className={cn(field, 'tabular')} aria-invalid={Boolean(errors.height)} aria-describedby="q-height-err" />
                  <Err id="q-height-err" msg={errors.height} />
                </div>
              </div>
              <div className="mt-5 lg:hidden">
                <SizePreview width={w} height={h} image={image} label={label} />
              </div>
            </>
          )}

          {sizeOptions.length > 0 && !sizesAreTalles && (
            <div className="mt-1">
              <p className="mb-1.5 text-sm font-semibold text-ink">Tamaño</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tamaño">
                {sizeOptions.map((s) => (
                  <Choice key={s.label} checked={size === s.label} onClick={() => setSize(size === s.label ? '' : s.label)} className="py-2.5 pr-9 text-sm font-bold">
                    {s.label}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          <div className={cn('grid gap-4 sm:grid-cols-2', (showMeasure || (sizeOptions.length > 0 && !sizesAreTalles)) && 'mt-5')}>
            <div>
              <Label htmlFor="q-qty">Cantidad</Label>
              <div className="flex h-12 w-fit items-center rounded-lg bg-white ring-1 ring-black/15">
                <button type="button" onClick={() => setQty((q) => Math.max(product?.minQty ?? 1, q - 1))} className="grid size-12 place-items-center text-ink" aria-label="Una menos">
                  <Minus className="size-4" />
                </button>
                <input
                  id="q-qty"
                  type="number"
                  inputMode="numeric"
                  min={product?.minQty ?? 1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(100000, Math.round(Number(e.target.value)) || 1)))}
                  className="tabular h-full w-16 bg-transparent text-center text-lg font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setQty((q) => q + 1)} className="grid size-12 place-items-center text-ink" aria-label="Una más">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            {(sizesAreTalles || mode === 'CUSTOM') && (
              <div>
                <Label htmlFor="q-size" optional>
                  {sizesAreTalles ? 'Talles' : isVehicle ? 'Vehículo (marca, modelo y año)' : 'Medida aproximada'}
                </Label>
                <input
                  id="q-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  maxLength={60}
                  placeholder={sizesAreTalles ? `Ej.: 4 M, 6 L, 2 XL` : isVehicle ? 'Ej.: Fiat Fiorino 2019' : 'Ej.: 2 × 1 m'}
                  className={field}
                />
                {sizesAreTalles && <p className="mt-1.5 text-xs text-slate">Talles disponibles: {sizeOptions.map((s) => s.label).join(', ')}</p>}
              </div>
            )}
          </div>

          {product && (product.materials.length > 0 || product.finishes.length > 0) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {product.materials.length > 0 && (
                <div>
                  <Label htmlFor="q-material" optional>
                    Material
                  </Label>
                  <select id="q-material" value={material} onChange={(e) => setMaterial(e.target.value)} className={cn(field, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2012%2012%27%3E%3Cpath%20d=%27M2%204.5%206%208l4-3.5%27%20fill=%27none%27%20stroke=%27%23000%27%20stroke-width=%271.6%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9')}>
                    <option value="">Que me recomienden</option>
                    {product.materials.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
              {product.finishes.length > 0 && (
                <div>
                  <Label htmlFor="q-finish" optional>
                    Terminación
                  </Label>
                  <select id="q-finish" value={finish} onChange={(e) => setFinish(e.target.value)} className={cn(field, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2012%2012%27%3E%3Cpath%20d=%27M2%204.5%206%208l4-3.5%27%20fill=%27none%27%20stroke=%27%23000%27%20stroke-width=%271.6%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9')}>
                    <option value="">Que me recomienden</option>
                    {product.finishes.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </Step>

        {/* 3. Diseño */}
        <Step n={3} title="El diseño" hint="Si tenés el logo o el archivo, subilo. Si no, lo hacemos con vos.">
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Diseño">
            <Choice checked={!needsDesign} onClick={() => setNeedsDesign(false)}>
              <span className="block pr-5 font-bold">Tengo el diseño</span>
              <span className="block text-sm text-slate">Logo o archivo listo</span>
            </Choice>
            <Choice checked={needsDesign} onClick={() => setNeedsDesign(true)}>
              <span className="block pr-5 font-bold">Necesito diseño</span>
              <span className="block text-sm text-slate">Lo creamos juntos</span>
            </Choice>
          </div>
          <div className="mt-4">
            <FileDrop files={files} onChange={setFiles} error={errors.files} />
            {needsDesign && <p className="mt-2 text-sm text-slate">Podés subir fotos, bocetos o ideas de referencia.</p>}
          </div>
        </Step>

        {/* 4. Entrega */}
        <Step n={4} title="Entrega">
          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Entrega">
            {DELIVERIES.map((d) => (
              <Choice key={d.v} checked={delivery === d.v} onClick={() => setDelivery(d.v)}>
                <span className="block pr-5 font-bold">{DELIVERY_LABEL[d.v]}</span>
                <span className="block text-sm text-slate">{d.hint}</span>
              </Choice>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="q-deadline" optional>
                ¿Para cuándo lo necesitás?
              </Label>
              <input id="q-deadline" type="date" value={deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} className={field} />
            </div>
            <div>
              <Label htmlFor="q-city" optional>
                Localidad
              </Label>
              <input id="q-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Villa Gesell" maxLength={60} autoComplete="address-level2" className={field} />
            </div>
          </div>
        </Step>

        {/* 5. Datos */}
        <Step n={5} title="Tus datos" hint="Te respondemos por WhatsApp a este número.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="q-customerName">Nombre</Label>
              <input id="q-customerName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={field} aria-invalid={Boolean(errors.customerName)} aria-describedby="q-name-err" />
              <Err id="q-name-err" msg={errors.customerName} />
            </div>
            <div>
              <Label htmlFor="q-phone">WhatsApp</Label>
              <input id="q-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="2255 123456" maxLength={24} className={cn(field, 'tabular')} aria-invalid={Boolean(errors.phone)} aria-describedby="q-phone-err" />
              <Err id="q-phone-err" msg={errors.phone} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="q-email" optional>
                Email
              </Label>
              <input id="q-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} aria-invalid={Boolean(errors.email)} aria-describedby="q-email-err" />
              <Err id="q-email-err" msg={errors.email} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="q-message" optional>
                Algo más que tengamos que saber
              </Label>
              <textarea id="q-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} placeholder="Colores, textos, dónde va colocado…" className={cn(field, 'h-auto py-3 leading-relaxed')} />
            </div>
          </div>
          {/* Campo trampa para bots: las personas no lo ven */}
          <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
            <label htmlFor="q-website">No completar</label>
            <input id="q-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </Step>

        <div className="space-y-4 lg:hidden">{Summary}</div>
        <SubmitBlock sending={sending} progress={progress} hasFiles={files.length > 0} error={errors.form} className="lg:hidden" />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-offset,0px)+1.5rem)] space-y-5 transition-[top] duration-300">
          {showMeasure && (
            <div className="rounded-md bg-white p-5 shadow-[0_22px_44px_-34px_rgb(0_0_0/0.5)] ring-1 ring-black/5">
              <SizePreview width={w} height={h} image={image} label={label} />
            </div>
          )}
          {!showMeasure && product && (
            <div className="overflow-hidden rounded-md bg-white shadow-[0_22px_44px_-34px_rgb(0_0_0/0.5)] ring-1 ring-black/5">
              <Img media={product.cover ?? product.images[0]} sizes="34vw" ratio="16/10" />
              <p className="p-4 text-sm text-slate">{product.summary}</p>
            </div>
          )}
          {Summary}
          <SubmitBlock sending={sending} progress={progress} hasFiles={files.length > 0} error={errors.form} />
        </div>
      </aside>
    </form>
  );
}

function SubmitBlock({ sending, progress, hasFiles, error, className }: { sending: boolean; progress: number; hasFiles: boolean; error?: string; className?: string }) {
  return (
    <div className={className}>
      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={sending} className={buttonClass('ink', 'lg', 'relative w-full overflow-hidden')}>
        {sending && hasFiles && <span className="absolute inset-y-0 left-0 bg-white/15 transition-[width]" style={{ width: `${progress}%` }} aria-hidden="true" />}
        {sending ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5 text-lime" />}
        <span className="relative">{sending ? (hasFiles && progress < 100 ? `Subiendo archivos ${progress}%` : 'Enviando…') : 'Enviar y seguir por WhatsApp'}</span>
      </button>
      <p className="mt-2.5 text-center text-xs text-slate">El pedido queda guardado y se abre WhatsApp con el mensaje listo.</p>
    </div>
  );
}
