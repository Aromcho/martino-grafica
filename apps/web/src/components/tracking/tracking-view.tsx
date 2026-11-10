'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, Check, MapPin, Truck, Wrench } from 'lucide-react';
import { useEffect } from 'react';
import { statusText, useBusiness } from '@/components/site/business-provider';
import { Led } from '@/components/site/status-pill';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatDate, money, waLink } from '@/lib/format';
import type { OrderTracking, WorkOrderStatus } from '@/lib/types';

const STEPS: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'];

function stepLabel(s: WorkOrderStatus, t: OrderTracking) {
  if (s === 'PENDING') return 'Recibido';
  if (s === 'IN_PROGRESS') return 'En producción';
  if (s === 'READY') return t.delivery === 'INSTALL' ? 'Listo para colocar' : t.delivery === 'SHIPPING' ? 'Listo para enviar' : 'Listo para retirar';
  return t.delivery === 'INSTALL' ? 'Colocado' : 'Entregado';
}

function headline(t: OrderTracking): { title: string; text: string } {
  switch (t.status) {
    case 'TO_CONFIRM':
      return { title: 'Falta tu confirmación', text: 'Ya tenemos anotado lo que pediste. Avisanos que lo confirmás y lo ponemos en marcha.' };
    case 'PENDING':
      return { title: 'Tu pedido está anotado', text: 'Ya está en la fila del taller. Te avisamos apenas arranquemos.' };
    case 'IN_PROGRESS':
      return { title: 'Lo estamos haciendo', text: 'Tu pedido está en producción: diseño, impresión o corte.' };
    case 'READY':
      return t.delivery === 'INSTALL'
        ? { title: 'Listo para colocar', text: 'Tu trabajo ya está terminado. Coordinamos con vos el día de la colocación.' }
        : t.delivery === 'SHIPPING'
          ? { title: 'Listo para enviar', text: 'Tu trabajo ya está terminado. Coordinamos el envío con vos.' }
          : { title: '¡Listo para retirar!', text: 'Tu trabajo ya está terminado. Pasá a buscarlo por el taller cuando quieras.' };
    case 'DELIVERED':
      return { title: t.delivery === 'INSTALL' ? 'Trabajo colocado' : 'Pedido entregado', text: `¡Gracias por elegirnos, ${t.firstName}! Cualquier cosa que necesites, escribinos.` };
    default:
      return { title: 'Pedido cancelado', text: 'Este pedido se canceló. Si es un error o querés retomarlo, escribinos.' };
  }
}

const when = (iso: string | undefined | null) => (iso ? formatDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

/** Página que ve el cliente con su link: en qué etapa está el pedido, para cuándo y cuánto resta */
export function TrackingView({ t }: { t: OrderTracking }) {
  const router = useRouter();
  const { info, hours } = useBusiness();
  const open = statusText(hours);

  // Se actualiza sola: el cliente puede dejarla abierta
  useEffect(() => {
    if (t.status === 'DELIVERED' || t.status === 'CANCELLED') return;
    const id = window.setInterval(() => router.refresh(), 60_000);
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [router, t.status]);

  const idx = STEPS.indexOf(t.status);
  const cancelled = t.status === 'CANCELLED';
  const h = headline(t);
  const pct = cancelled || idx < 0 ? 0 : (idx / (STEPS.length - 1)) * 100;
  const waText =
    t.status === 'TO_CONFIRM'
      ? `Hola Martino Gráfica 👋 Confirmo mi pedido ${t.ref}${t.title ? ` (${t.title})` : ''}.`
      : `Hola Martino Gráfica 👋 Consulto por mi pedido ${t.ref}${t.title ? ` (${t.title})` : ''}.`;
  const DeliveryIcon = t.delivery === 'INSTALL' ? Wrench : t.delivery === 'SHIPPING' ? Truck : MapPin;

  return (
    <div className="container-x pb-[calc(var(--tabbar-h)+3rem)] pt-[calc(var(--header-h)+env(safe-area-inset-top)+1.75rem)] lg:pb-24 lg:pt-[calc(var(--header-h)+3.5rem)]">
      <header className="max-w-3xl">
        <p className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-smoke">
          <span>Seguimiento de pedido</span>
          <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-white ring-1 ring-white/15">{t.ref}</span>
        </p>
        <h1 className={cn('display t-lg mt-4', t.status === 'READY' && 'text-lime')}>{h.title}</h1>
        <p className="lede mt-4 text-white/75">
          {t.status !== 'DELIVERED' && t.status !== 'CANCELLED' ? `Hola ${t.firstName}. ` : ''}
          {h.text}
        </p>
      </header>

      {/* Recorrido: la línea de corte marca lo que falta, el lima lo que ya se hizo */}
      {!cancelled && (
        <ol className="relative mt-10 grid max-w-4xl gap-0 sm:mt-14 sm:grid-cols-4" aria-label="Etapas del pedido">
          <span className="absolute left-[0.6875rem] top-3 h-[calc(100%-1.5rem)] w-0.5 bg-[linear-gradient(to_bottom,var(--color-cut)_60%,transparent_0)] bg-[length:2px_9px] opacity-50 sm:hidden" aria-hidden="true" />
          <span className="absolute left-[0.6875rem] top-3 w-0.5 bg-lime transition-[height] duration-700 sm:hidden" style={{ height: `calc((100% - 1.5rem) * ${pct / 100})` }} aria-hidden="true" />
          <span className="cut-line absolute left-[12.5%] right-[12.5%] top-[0.6875rem] opacity-50 max-sm:hidden" aria-hidden="true" />
          <span className="absolute left-[12.5%] top-[0.6875rem] h-0.5 bg-lime transition-[width] duration-700 max-sm:hidden" style={{ width: `${pct * 0.75}%` }} aria-hidden="true" />
          {STEPS.map((s, i) => {
            const done = idx > i || t.status === 'DELIVERED';
            const current = idx === i && t.status !== 'DELIVERED';
            const date = when(i === 0 ? t.orderedAt : t.reached[s]);
            return (
              <li key={s} className="relative flex gap-4 pb-7 last:pb-0 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center" aria-current={current ? 'step' : undefined}>
                <span className={cn('relative z-[1] grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-ink', done ? 'bg-lime text-ink' : current ? 'bg-lime' : 'bg-steel')}>
                  {done ? <Check className="size-3.5" strokeWidth={3.5} /> : current ? <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-60" /> : null}
                </span>
                <span className="min-w-0">
                  <span className={cn('block font-bold leading-tight', done || current ? 'text-white' : 'text-smoke', current && 'text-lime')}>{stepLabel(s, t)}</span>
                  {(done || current) && date && <span className="tabular mt-0.5 block text-xs text-smoke">{date}</span>}
                  {current && !date && t.orderedAt && <span className="mt-0.5 block text-xs text-smoke">Ahora</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 grid max-w-4xl items-start gap-5 sm:mt-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="liner rounded-md p-5 sm:p-7" style={{ ['--cm' as string]: '18px' }} aria-labelledby="pedido-title">
          <p className="text-sm font-bold text-slate">Tu pedido</p>
          <h2 id="pedido-title" className="display mt-2 text-[clamp(1.5rem,4.5vw,2.1rem)]">
            {t.title || 'Trabajo a medida'}
          </h2>
          {t.details && <p className="mt-3 whitespace-pre-line text-[0.98rem] text-ink/80">{t.details}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-black/15 pt-5">
            <div>
              <dt className="flex items-center gap-1.5 text-sm text-slate">
                <CalendarDays className="size-4" /> {t.status === 'DELIVERED' ? 'Entregado' : 'Fecha estimada'}
              </dt>
              <dd className="mt-1 font-bold first-letter:uppercase">
                {t.status === 'DELIVERED' && t.deliveredAt
                  ? formatDate(t.deliveredAt, { weekday: 'long', day: 'numeric', month: 'long' })
                  : t.dueDate
                    ? formatDate(t.dueDate, { weekday: 'long', day: 'numeric', month: 'long' })
                    : (t.dueNote ?? 'A coordinar')}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-sm text-slate">
                <DeliveryIcon className="size-4" /> Entrega
              </dt>
              <dd className="mt-1 font-bold">{t.delivery === 'INSTALL' ? 'Con colocación' : t.delivery === 'SHIPPING' ? 'Envío' : 'Retiro en el taller'}</dd>
            </div>
          </dl>
          {t.total != null && (
            <dl className="tabular mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-white px-2 py-3 ring-1 ring-black/10">
                <dt className="text-xs text-slate">Total</dt>
                <dd className="mt-0.5 font-extrabold">{money(t.total)}</dd>
              </div>
              <div className="rounded bg-white px-2 py-3 ring-1 ring-black/10">
                <dt className="text-xs text-slate">Abonado</dt>
                <dd className="mt-0.5 font-extrabold">{money(t.paid)}</dd>
              </div>
              <div className={cn('rounded px-2 py-3', t.balance > 0 ? 'bg-ink text-white' : 'bg-lime text-ink')}>
                <dt className={cn('text-xs', t.balance > 0 ? 'text-smoke' : 'text-ink/70')}>{t.balance > 0 ? 'Resta abonar' : 'Saldo'}</dt>
                <dd className={cn('mt-0.5 font-extrabold', t.balance > 0 && 'text-lime')}>{t.balance > 0 ? money(t.balance) : 'Pago'}</dd>
              </div>
            </dl>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-md bg-graphite p-5 ring-1 ring-white/10 sm:p-6">
            <h2 className="text-lg font-bold">{t.status === 'TO_CONFIRM' ? '¿Lo confirmamos?' : '¿Alguna duda?'}</h2>
            <p className="mt-1.5 text-sm text-smoke">{t.status === 'TO_CONFIRM' ? 'Mandanos un mensaje y arrancamos con tu pedido.' : 'Escribinos con tu número de pedido y te respondemos.'}</p>
            {info?.whatsapp && (
              <a href={waLink(info.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className={buttonClass('lime', 'md', 'mt-4 w-full')}>
                <WhatsAppIcon className="size-5" /> {t.status === 'TO_CONFIRM' ? 'Confirmar por WhatsApp' : 'Escribir por WhatsApp'}
              </a>
            )}
          </div>

          {info && t.status !== 'CANCELLED' && t.delivery === 'PICKUP' && (
            <div className="rounded-md bg-graphite p-5 ring-1 ring-white/10 sm:p-6">
              <h2 className="text-lg font-bold">Dónde retirarlo</h2>
              <a href={info.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex gap-3 font-bold">
                <MapPin className="mt-0.5 size-5 shrink-0 text-lime" />
                <span>
                  {info.address}
                  <span className="block text-sm font-normal text-smoke">
                    {info.crossStreets ? `${info.crossStreets}, ` : ''}
                    {info.city}
                  </span>
                </span>
              </a>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <Led state={open.state} /> {open.long}
              </p>
            </div>
          )}
        </aside>
      </div>

      {t.status !== 'DELIVERED' && t.status !== 'CANCELLED' && <p className="mt-8 text-xs text-smoke">Esta página se actualiza sola. Guardá el link para volver cuando quieras.</p>}
    </div>
  );
}
