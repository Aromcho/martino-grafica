'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronLeft, Pencil, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DueChip, ORDER_DOT, OrderStatusBadge } from '@/components/admin/orders/bits';
import { OrderDrawer } from '@/components/admin/orders/order-form';
import { TrackShare } from '@/components/admin/orders/share';
import { Btn, Card, DeleteButton, LoadingBlock, MoneyInput, PageHeader, Select, Textarea } from '@/components/admin/ui';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useAdminMutation, useAdminQuery, useMe } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, money } from '@/lib/format';
import { advanceLabel, methodLabel, nextStatus, ORDER_DELIVERY_LABEL, ORDER_FLOW, ORDER_STATUS_LABEL, orderedText, PAYMENT_METHODS } from '@/lib/orders';
import type { PaymentMethod, WorkOrderDetail, WorkOrderStatus } from '@/lib/types';

const EVENT_DOT: Record<string, string> = { status: 'bg-ink', payment: 'bg-ok', whatsapp: 'bg-lime-deep', created: 'bg-cut' };

function Payments({ o }: { o: WorkOrderDetail }) {
  const inv = [['order', o.id], ['orders']];
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('EFECTIVO');
  useEffect(() => setAmount(o.balance || null), [o.balance]);
  const add = useAdminMutation<void, WorkOrderDetail>({
    method: 'POST',
    path: `/admin/orders/${o.id}/payments`,
    body: () => ({ amount, method }),
    invalidate: inv,
    success: (r) => (r.balance > 0 ? `Cobro anotado. Resta ${money(r.balance)}` : 'Cobro anotado: queda pago'),
  });
  const remove = useAdminMutation<string>({ method: 'DELETE', path: (pid) => `/admin/orders/${o.id}/payments/${pid}`, invalidate: inv, success: 'Cobro anulado' });
  const pct = o.total ? Math.min(100, Math.round((o.paid / o.total) * 100)) : 0;

  return (
    <Card id="cobros" title="Cobros" className="scroll-mt-24">
      {o.total == null ? (
        <p className="text-sm text-slate">Todavía no tiene precio. Cargá el total con «Editar» para anotar la seña y los cobros.</p>
      ) : (
        <>
          <dl className="tabular grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-liner px-2 py-2.5">
              <dt className="text-xs text-slate">Total</dt>
              <dd className="mt-0.5 font-extrabold">{money(o.total)}</dd>
            </div>
            <div className="rounded bg-liner px-2 py-2.5">
              <dt className="text-xs text-slate">Cobrado</dt>
              <dd className="mt-0.5 font-extrabold">{money(o.paid)}</dd>
            </div>
            <div className={cn('rounded px-2 py-2.5', o.balance > 0 ? 'bg-[#fde8e6] text-[#912018]' : 'bg-[#dcf5e6] text-[#145c33]')}>
              <dt className="text-xs opacity-80">{o.balance > 0 ? 'Resta' : 'Saldo'}</dt>
              <dd className="mt-0.5 font-extrabold">{o.balance > 0 ? money(o.balance) : 'Pago'}</dd>
            </div>
          </dl>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-liner-deep" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje cobrado">
            <div className={cn('h-full rounded-full transition-[width] duration-500', pct === 100 ? 'bg-ok' : 'bg-ink')} style={{ width: `${pct}%` }} />
          </div>

          {o.balance > 0 && (
            <form
              className="mt-4 space-y-2 border-t border-black/8 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (amount && amount <= o.balance) add.mutate();
              }}
            >
              <div className="flex gap-2">
                <MoneyInput value={amount} onChange={setAmount} placeholder="Importe" className="min-w-0 flex-1" />
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-auto" aria-label="Medio de pago">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              {amount != null && amount > o.balance && <p className="text-xs font-semibold text-danger">El saldo es {money(o.balance)}.</p>}
              <Btn type="submit" className="w-full" disabled={!amount || amount > o.balance || add.isPending}>
                <Check className="size-4" strokeWidth={3} /> {amount === o.balance ? 'Cobrar el saldo' : 'Anotar cobro'}
              </Btn>
            </form>
          )}

          {o.payments.length > 0 && (
            <ul className="mt-4 divide-y divide-black/8 border-t border-black/8">
              {o.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-sm font-bold">
                      {money(p.amount)} <span className="font-semibold text-slate">· {methodLabel(p.method)}</span>
                    </span>
                    <span className="block truncate text-xs text-slate">
                      {o.source === 'excel' && p.note === 'Importado del Excel' ? 'Importado del Excel' : formatDateTime(p.paidAt)}
                      {p.note && p.note !== 'Importado del Excel' ? ` · ${p.note}` : ''}
                      {p.user ? ` · ${p.user.name}` : ''}
                    </span>
                  </span>
                  <DeleteButton compact label="Anular cobro" onConfirm={() => remove.mutate(p.id)} pending={remove.isPending && remove.variables === p.id} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const { data: o, isLoading, refetch } = useAdminQuery<WorkOrderDetail>(['order', id], `/admin/orders/${id}`);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => setNotes(o?.notes ?? ''), [o?.notes]);

  const inv = [['order', id], ['orders']];
  const update = useAdminMutation<{ status?: WorkOrderStatus; notes?: string | null }, WorkOrderDetail>({
    method: 'PATCH',
    path: `/admin/orders/${id}`,
    invalidate: inv,
    success: (r) => `${r.ref}: ${ORDER_STATUS_LABEL[r.status].toLowerCase()}`,
  });
  const saveNotes = useAdminMutation<{ notes: string | null }>({ method: 'PATCH', path: `/admin/orders/${id}`, invalidate: inv, success: 'Notas guardadas' });
  const addNote = useAdminMutation<{ note: string }>({ method: 'POST', path: `/admin/orders/${id}/notes`, invalidate: inv, success: 'Nota agregada', onSuccess: () => setNote('') });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/orders/${id}`, invalidate: [['orders']], success: 'Pedido eliminado', onSuccess: () => router.replace('/admin/pedidos') });

  if (isLoading || !o) return <LoadingBlock />;

  const next = nextStatus(o.status);
  // «A confirmar» sólo aparece mientras el pedido está esperando el OK del cliente
  const flow = o.status === 'TO_CONFIRM' ? ORDER_FLOW : ORDER_FLOW.filter((s) => s !== 'TO_CONFIRM');
  const idx = flow.indexOf(o.status);
  const facts = [
    ['Entrega', ORDER_DELIVERY_LABEL[o.delivery]],
    ['Para cuándo', o.dueDate ? formatDate(o.dueDate, { weekday: 'long', day: 'numeric', month: 'long' }) : o.dueNote],
    ['Se tomó', `${orderedText(o)}${o.author && o.source !== 'excel' ? ` · ${o.author.name}` : ''}`],
    ['Se entregó', o.deliveredAt && o.source !== 'excel' ? formatDateTime(o.deliveredAt) : null],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/pedidos" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">
            <ChevronLeft className="size-4" /> Pedidos
          </Link>
        }
        title={o.customerName}
        text={
          <span className="flex flex-wrap items-center gap-2">
            <span className="tabular font-bold text-ink">{o.ref}</span>
            <OrderStatusBadge status={o.status} />
            <DueChip order={o} />
            <span className="truncate">{o.title}</span>
          </span>
        }
        actions={
          <Btn variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Editar
          </Btn>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card title="¿En qué está?">
            <ol className={cn('grid grid-cols-2 gap-2', flow.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}>
              {flow.map((s, i) => {
                const current = s === o.status;
                const done = o.status !== 'CANCELLED' && i < idx;
                return (
                  <li key={s} className={cn(s === 'TO_CONFIRM' && 'max-sm:col-span-2')}>
                    <button
                      type="button"
                      onClick={() => !current && update.mutate({ status: s })}
                      disabled={update.isPending}
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'flex h-full min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-md px-3 py-2 text-left text-sm font-bold ring-1 transition-colors',
                        current ? 'bg-ink text-lime ring-ink' : done ? 'bg-lime/40 text-ink ring-transparent hover:bg-lime/60' : 'bg-white text-slate ring-black/12 hover:text-ink hover:ring-black/30',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {done ? <Check className="size-3.5" strokeWidth={3} /> : <span className={cn('size-2 rounded-full', current ? 'bg-lime' : ORDER_DOT[s])} aria-hidden="true" />}
                        {s === 'READY' && o.delivery === 'INSTALL' ? 'Para colocar' : s === 'DELIVERED' && o.delivery === 'INSTALL' ? 'Colocado' : ORDER_STATUS_LABEL[s]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/8 pt-4">
              {o.status === 'CANCELLED' ? (
                <Btn onClick={() => update.mutate({ status: 'PENDING' })} disabled={update.isPending}>
                  Reabrir el pedido
                </Btn>
              ) : next ? (
                <Btn variant="lime" onClick={() => update.mutate({ status: next })} disabled={update.isPending} className="h-12 px-5">
                  {advanceLabel(o)}: pasar a «{ORDER_STATUS_LABEL[next]}» <ArrowRight className="size-4" />
                </Btn>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm font-bold text-[#145c33]">
                  <Check className="size-4" strokeWidth={3} /> Pedido entregado{o.balance > 0 ? `. Quedan ${money(o.balance)} por cobrar.` : ' y pago.'}
                </p>
              )}
              {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                <Btn variant="ghost" className="ml-auto text-danger" onClick={() => update.mutate({ status: 'CANCELLED' })} disabled={update.isPending}>
                  <X className="size-4" /> Cancelar pedido
                </Btn>
              )}
            </div>
          </Card>

          <Card title="Seguimiento para el cliente">
            <p className="-mt-2 mb-3 text-sm text-slate">Con este link el cliente ve en qué está su pedido. El mensaje se arma solo según la etapa; retocalo si querés.</p>
            <TrackShare order={o} onSent={() => refetch()} />
          </Card>

          <Card
            title="El pedido"
            actions={
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-bold underline-offset-4 hover:underline">
                Editar
              </button>
            }
          >
            <p className="text-lg font-extrabold leading-snug">{o.title || 'Sin descripción'}</p>
            {o.details && <p className="mt-2 whitespace-pre-line rounded bg-liner p-3.5 text-[0.95rem]">{o.details}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-slate">{k}</dt>
                  <dd className="mt-0.5 break-words font-semibold first-letter:uppercase">{v}</dd>
                </div>
              ))}
            </dl>
            {o.quote && (
              <Link href={`/admin/consultas/${o.quote.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline">
                Ver la consulta de la web ({o.quote.code}) <ArrowRight className="size-3.5" />
              </Link>
            )}
          </Card>

          <Card title="Notas internas">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sólo las ve el equipo: dónde quedó guardado, qué falta, con quién hablar…" />
            <Btn size="sm" className="mt-2" onClick={() => saveNotes.mutate({ notes: notes.trim() || null })} disabled={saveNotes.isPending || notes === (o.notes ?? '')}>
              Guardar notas
            </Btn>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Payments o={o} />

          <Card title="Cliente">
            <p className="font-bold">{o.customerName}</p>
            {o.phone ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`https://wa.me/${o.customerWhatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-liner px-3.5 text-sm font-bold hover:bg-lime">
                  <WhatsAppIcon className="size-4.5" /> <span className="tabular">{o.phone}</span>
                </a>
                <a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold hover:bg-black/5">
                  <Phone className="size-4" /> Llamar
                </a>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="mt-1 text-sm font-semibold text-slate underline underline-offset-4 hover:text-ink">
                Agregar su WhatsApp
              </button>
            )}
            {o.related.length > 0 && (
              <div className="mt-4 border-t border-black/8 pt-3">
                <p className="mb-1.5 text-xs font-bold text-slate">Otros pedidos de este cliente</p>
                <ul className="-mx-2">
                  {o.related.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/pedidos/${r.id}`} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-liner">
                        <span className={cn('size-2 shrink-0 rounded-full', ORDER_DOT[r.status])} title={ORDER_STATUS_LABEL[r.status]} />
                        <span className="tabular shrink-0 text-xs font-bold text-slate">{r.ref}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{r.title || 'Sin descripción'}</span>
                        {r.balance > 0 && r.status !== 'CANCELLED' ? <span className="tabular shrink-0 text-xs font-bold text-danger">debe {money(r.balance)}</span> : r.total != null && <span className="tabular shrink-0 text-xs text-slate">{money(r.total)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Historial">
            <form
              className="mb-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim()) addNote.mutate({ note: note.trim() });
              }}
            >
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota al historial" className="h-10 min-w-0 flex-1 rounded-lg bg-white px-3 text-sm outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
              <Btn size="sm" type="submit" disabled={!note.trim() || addNote.isPending}>
                Agregar
              </Btn>
            </form>
            <ol className="relative space-y-4 border-l-2 border-dashed border-black/12 pl-4">
              {o.events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className={cn('absolute -left-[1.4rem] top-1 size-2.5 rounded-full ring-2 ring-white', EVENT_DOT[ev.type] ?? 'bg-smoke')} aria-hidden="true" />
                  <p className="text-sm font-semibold">{ev.note ?? ev.type}</p>
                  <p className="text-xs text-slate">
                    {o.source === 'excel' && ev.type === 'created' ? formatDate(ev.createdAt, { month: 'long', year: 'numeric' }) : formatDateTime(ev.createdAt)}
                    {ev.user ? ` · ${ev.user.name}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Card>

          {me.data?.role === 'ADMIN' && (
            <div className="flex justify-end">
              <DeleteButton label="Eliminar pedido" onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />
            </div>
          )}
        </div>
      </div>

      <OrderDrawer open={editing} onClose={() => setEditing(false)} order={o} />
    </>
  );
}
