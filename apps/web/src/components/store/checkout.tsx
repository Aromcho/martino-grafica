'use client';

import Link from 'next/link';
import { Check, Loader2, ShoppingBag, Store, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useBusiness } from '@/components/site/business-provider';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { CartLineRow, useCart } from './cart';

const field =
  'w-full rounded-lg bg-white px-3.5 text-[1rem] text-ink outline-none ring-1 ring-black/15 placeholder:text-slate/70 focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger';

type Done = { code: string; total: number; unpriced: number; whatsappUrl: string | null };

/** Carrito + datos de contacto → guarda el pedido en el panel y lo manda por WhatsApp armado */
export function Checkout() {
  const { lines, ready, count, total, unpriced, clear } = useCart();
  const { info } = useBusiness();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [delivery, setDelivery] = useState<'PICKUP' | 'SHIPPING'>('PICKUP');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mg-cliente') ?? 'null') as { name?: string; phone?: string; email?: string; city?: string } | null;
      if (saved) {
        setName(saved.name ?? '');
        setPhone(saved.phone ?? '');
        setEmail(saved.email ?? '');
        setCity(saved.city ?? '');
      }
    } catch {
      /* sin storage */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Contanos tu nombre';
    if (!/^[\d\s()+-]{8,24}$/.test(phone.trim())) errs.phone = 'Revisá el teléfono: con código de área, sólo números';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Revisá el email';
    if (delivery === 'SHIPPING' && city.trim().length < 2) errs.city = 'Para el envío necesitamos la localidad';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const win = info?.whatsapp ? window.open('', '_blank') : null;
    setSending(true);
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          delivery,
          message: message.trim() || undefined,
          website: website || undefined,
          items: lines.map((l) => ({ productId: l.id, quantity: l.qty })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(res.status === 429 ? 'Hiciste varios pedidos seguidos. Esperá unos minutos o escribinos por WhatsApp.' : [data?.message].flat().join('. ') || 'No pudimos enviar el pedido.');
      try {
        localStorage.setItem('mg-cliente', JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), city: city.trim() }));
      } catch {
        /* sin storage */
      }
      setDone(data as Done);
      clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (win && data.whatsappUrl) win.location.href = data.whatsappUrl;
      else win?.close();
    } catch (err) {
      win?.close();
      setErrors({ form: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="container-x pb-24">
        <div className="mx-auto max-w-xl rounded-md bg-white p-6 text-ink shadow-[0_22px_44px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/5 sm:p-9" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-lime" aria-hidden="true">
            <Check className="size-6" strokeWidth={3} />
          </span>
          <p className="display mt-5 text-[1.9rem]">¡Pedido recibido!</p>
          <p className="tabular mt-2 font-bold">Código {done.code}</p>
          <p className="mt-3 text-slate">
            {done.total ? `Total de la web: ${money(done.total)}${done.unpriced ? ' + lo que hay que consultar' : ''}. ` : ''}
            Mandanos el pedido por WhatsApp y te confirmamos stock, precio final, pago y entrega.
          </p>
          {done.whatsappUrl && (
            <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('ink', 'lg', 'mt-6 w-full')}>
              <WhatsAppIcon className="size-5 text-lime" /> Enviar el pedido por WhatsApp
            </a>
          )}
          <Link href="/tienda" className="mt-4 block text-center text-sm font-bold underline-offset-4 hover:underline">
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  if (ready && lines.length === 0) {
    return (
      <div className="container-x pb-24">
        <div className="liner rounded-md px-6 py-16 text-center">
          <ShoppingBag className="mx-auto size-10 text-slate" />
          <p className="display t-sm mt-4">Tu carrito está vacío</p>
          <p className="mx-auto mt-3 max-w-md text-slate">Recorré la tienda y sumá lo que necesites: vinilos, lonas, placas, tintas y más.</p>
          <Link href="/tienda" className={buttonClass('ink', 'md', 'mt-6')}>
            Ir a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`o-${k}-err`} className="mt-1.5 text-sm font-semibold text-danger" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="container-x grid gap-8 pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
      <section aria-labelledby="carrito-items" className="min-w-0">
        <h2 id="carrito-items" className="text-lg font-bold">
          {count} {count === 1 ? 'unidad' : 'unidades'}
        </h2>
        <ul className="mt-2 divide-y divide-white/10 border-y border-white/10">
          {lines.map((l) => (
            <CartLineRow key={l.id} line={l} />
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-smoke">Total</span>
          <span className="tabular display text-[2rem] text-lime">{money(total)}</span>
        </div>
        {unpriced > 0 && <p className="mt-1 text-right text-sm text-smoke">+ {unpriced === 1 ? 'un producto' : `${unpriced} productos`} con precio a consultar</p>}
        <p className="mt-4 text-sm text-smoke">Los precios son los publicados en la web. El taller te confirma stock y precio final antes de preparar el pedido.</p>
      </section>

      <form onSubmit={submit} noValidate className="relative grid content-start gap-4 rounded-md bg-white p-5 text-ink shadow-[0_22px_44px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/5 sm:grid-cols-2 sm:p-7 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
        <p className="display text-[1.5rem] sm:col-span-2">Tus datos</p>
        <div>
          <label htmlFor="o-name" className="mb-1.5 block text-sm font-semibold">
            Nombre
          </label>
          <input id="o-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={cn(field, 'h-12')} aria-invalid={Boolean(errors.name)} aria-describedby="o-name-err" />
          {err('name')}
        </div>
        <div>
          <label htmlFor="o-phone" className="mb-1.5 block text-sm font-semibold">
            WhatsApp
          </label>
          <input id="o-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={24} placeholder="2255 123456" className={cn(field, 'tabular h-12')} aria-invalid={Boolean(errors.phone)} aria-describedby="o-phone-err" />
          {err('phone')}
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold">Entrega</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['PICKUP', 'Retiro en el taller', Store],
                ['SHIPPING', 'Envío a coordinar', Truck],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setDelivery(v)}
                aria-pressed={delivery === v}
                className={cn('flex h-14 items-center gap-2.5 rounded-lg px-3.5 text-left text-[0.95rem] font-bold ring-1 transition-colors', delivery === v ? 'bg-ink text-white ring-ink' : 'bg-white ring-black/15 hover:ring-black/40')}
              >
                <Icon className={cn('size-5 shrink-0', delivery === v ? 'text-lime' : 'text-slate')} /> {label}
              </button>
            ))}
          </div>
          {delivery === 'PICKUP' && info?.address && <p className="mt-2 text-sm text-slate">{`${info.address}, ${info.city}.`}</p>}
        </fieldset>

        <div>
          <label htmlFor="o-city" className="mb-1.5 block text-sm font-semibold">
            Localidad {delivery === 'PICKUP' && <span className="font-normal text-slate">(opcional)</span>}
          </label>
          <input id="o-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" maxLength={60} className={cn(field, 'h-12')} aria-invalid={Boolean(errors.city)} aria-describedby="o-city-err" />
          {err('city')}
        </div>
        <div>
          <label htmlFor="o-email" className="mb-1.5 block text-sm font-semibold">
            Email <span className="font-normal text-slate">(opcional)</span>
          </label>
          <input id="o-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cn(field, 'h-12')} aria-invalid={Boolean(errors.email)} aria-describedby="o-email-err" />
          {err('email')}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="o-message" className="mb-1.5 block text-sm font-semibold">
            Comentarios <span className="font-normal text-slate">(opcional)</span>
          </label>
          <textarea id="o-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} placeholder="Colores, medidas, cuándo lo necesitás…" className={cn(field, 'py-3 leading-relaxed')} />
        </div>
        <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
          <label htmlFor="o-website">No completar</label>
          <input id="o-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          {errors.form && (
            <p className="mb-3 rounded-md bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">
              {errors.form}
            </p>
          )}
          <button type="submit" disabled={sending || !ready || lines.length === 0} className={buttonClass('ink', 'lg', 'w-full')}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5 text-lime" />} Hacer el pedido
          </button>
          <p className="mt-2.5 text-center text-xs text-slate">Se guarda en el taller y se abre WhatsApp con el pedido armado.</p>
        </div>
      </form>
    </div>
  );
}
