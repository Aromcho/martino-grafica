'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Check, ChevronLeft, Download, ExternalLink, FileText, Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/admin/status';
import { Btn, Card, DeleteButton, Field, LoadingBlock, MoneyInput, PageHeader, Textarea } from '@/components/admin/ui';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useAdminMutation, useAdminQuery, useMe } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { DELIVERY_LABEL, fileSize, formatDate, formatDateTime, measure, money, STATUS_FLOW, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { QuoteDetail, QuoteStatus } from '@/lib/types';

const replyText = (url: string) => {
  try {
    return new URL(url).searchParams.get('text') ?? '';
  } catch {
    return '';
  }
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const { data: q, isLoading } = useAdminQuery<QuoteDetail>(['quote', id], `/admin/quotes/${id}`);
  const [price, setPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!q) return;
    setPrice(q.quotedPrice);
    setNotes(q.adminNotes ?? '');
    setReply(replyText(q.whatsappUrl));
  }, [q]);

  const inv = [['quote', id], ['quotes']];
  const update = useAdminMutation<{ status?: QuoteStatus; quotedPrice?: number | null; adminNotes?: string | null }>({ method: 'PATCH', path: `/admin/quotes/${id}`, invalidate: inv, success: 'Guardado' });
  const addNote = useAdminMutation<{ note: string }>({ method: 'POST', path: `/admin/quotes/${id}/notes`, invalidate: inv, success: 'Nota agregada', onSuccess: () => setNote('') });
  const logWa = useAdminMutation({ method: 'POST', path: `/admin/quotes/${id}/whatsapp`, invalidate: inv, success: false });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/quotes/${id}`, invalidate: [['quotes']], success: 'Pedido eliminado', onSuccess: () => router.replace('/admin/pedidos') });

  if (isLoading || !q) return <LoadingBlock />;

  const sendWhatsapp = () => {
    window.open(`https://wa.me/${q.customerWhatsapp}?text=${encodeURIComponent(reply)}`, '_blank', 'noopener');
    logWa.mutate(undefined);
  };

  const facts = [
    ['Trabajo', q.kind === 'ORDER' ? null : q.product ? q.product.name : q.productName],
    ['Rubro', q.category?.name],
    ['Medida', measure(q.width, q.height)],
    ['Talle, tamaño o vehículo', q.size],
    ['Cantidad', q.kind === 'QUOTE' ? String(q.quantity) : null],
    ['Entrega', q.kind === 'ORDER' ? (q.delivery === 'SHIPPING' ? 'Envío a coordinar' : 'Retiro en el taller') : null],
    ['Material', q.material],
    ['Terminación', q.finish],
    ['Diseño', q.kind === 'QUOTE' ? (q.needsDesign ? 'Necesita diseño' : 'Tiene el diseño') : null],
    ['Entrega', q.kind === 'QUOTE' ? DELIVERY_LABEL[q.delivery] : null],
    ['Para cuándo', q.deadline ? formatDate(q.deadline, { weekday: 'short', day: 'numeric', month: 'long' }) : null],
    ['Estimado web', q.estimate ? money(q.estimate) : null],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/pedidos" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">
            <ChevronLeft className="size-4" /> Pedidos
          </Link>
        }
        title={q.customerName}
        text={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={q.status} />
            <span className="tabular">{q.code}</span>
            <span>· {q.kind === 'CONTACT' ? 'Consulta' : q.kind === 'ORDER' ? 'Compra en la tienda' : 'Presupuesto'} · {timeAgo(q.createdAt)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card title="Responder por WhatsApp">
            <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Mensaje para el cliente" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Btn variant="lime" onClick={sendWhatsapp} disabled={!reply.trim()}>
                <WhatsAppIcon className="size-5" /> Abrir WhatsApp
              </Btn>
              <a href={`tel:${q.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-sm font-bold">
                <Phone className="size-4" /> {q.phone}
              </a>
              {q.email && (
                <a href={`mailto:${q.email}?subject=${encodeURIComponent(`Tu pedido ${q.code} en Martino Gráfica`)}`} className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Mail className="size-4" /> {q.email}
                </a>
              )}
            </div>
            <p className="mt-2 text-xs text-slate">El mensaje cambia según el estado. Si el pedido es nuevo, al responder pasa a «Contactado».</p>
          </Card>

          <Card title="Estado">
            <ol className="flex flex-wrap gap-2">
              {STATUS_FLOW.map((s, i) => {
                const idx = STATUS_FLOW.indexOf(q.status);
                const done = q.status !== 'CANCELLED' && i <= idx;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => s !== q.status && update.mutate({ status: s })}
                      disabled={update.isPending}
                      className={cn('inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-bold ring-1 transition-colors', s === q.status ? 'bg-ink text-lime ring-ink' : done ? 'bg-lime/40 text-ink ring-transparent' : 'bg-white text-slate ring-black/12 hover:text-ink hover:ring-black/30')}
                      aria-current={s === q.status ? 'step' : undefined}
                    >
                      {done && s !== q.status && <Check className="size-3.5" strokeWidth={3} />}
                      {STATUS_LABEL[s]}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/8 pt-4">
              <Field label={q.kind === 'ORDER' ? 'Total confirmado' : 'Precio presupuestado'} className="w-48">
                <MoneyInput value={price} onChange={setPrice} placeholder="0" />
              </Field>
              <Btn onClick={() => update.mutate({ quotedPrice: price, ...(price && ['NEW', 'CONTACTED'].includes(q.status) ? { status: 'QUOTED' as const } : {}) })} disabled={update.isPending || price === q.quotedPrice}>
                Guardar precio
              </Btn>
              {q.status !== 'CANCELLED' ? (
                <Btn variant="ghost" className="ml-auto text-danger" onClick={() => update.mutate({ status: 'CANCELLED' })}>
                  Cancelar pedido
                </Btn>
              ) : (
                <Btn variant="ghost" className="ml-auto" onClick={() => update.mutate({ status: 'NEW' })}>
                  Reabrir
                </Btn>
              )}
            </div>
          </Card>

          {q.kind === 'ORDER' && q.items.length > 0 && (
            <Card title={`Productos (${q.items.reduce((n, it) => n + it.quantity, 0)} u.)`}>
              <ul className="divide-y divide-black/8">
                {q.items.map((it) => (
                  <li key={it.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="tabular w-10 shrink-0 font-bold">{it.quantity}×</span>
                    <span className="min-w-0 flex-1">
                      {it.product?.active ? (
                        <a href={`/tienda/${it.product.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">
                          {it.name}
                        </a>
                      ) : (
                        <span className="font-semibold">{it.name}</span>
                      )}
                      {it.sku && <span className="tabular ml-2 text-xs text-slate">{it.sku}</span>}
                    </span>
                    <span className="tabular shrink-0 text-right text-sm">
                      {it.subtotal != null ? <span className="font-bold">{money(it.subtotal)}</span> : <span className="text-slate">a consultar</span>}
                      {it.unitPrice != null && it.quantity > 1 && <span className="block text-xs text-slate">{money(it.unitPrice)} c/u</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {q.estimate ? (
                <p className="mt-3 flex items-baseline justify-between border-t border-black/10 pt-3">
                  <span className="text-sm text-slate">Total con precios de la web</span>
                  <span className="tabular text-lg font-extrabold">{money(q.estimate)}</span>
                </p>
              ) : null}
            </Card>
          )}

          <Card title={q.kind === 'CONTACT' ? 'Consulta' : q.kind === 'ORDER' ? 'Datos del pedido' : 'Lo que pidió'}>
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {facts.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs text-slate">{k}</dt>
                    <dd className="mt-0.5 break-words font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {q.message && <p className={cn('whitespace-pre-line rounded bg-liner p-3.5 text-[0.95rem]', facts.length > 0 && 'mt-5')}>{q.message}</p>}
            {q.product && (
              <a href={`/servicios/${q.product.slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline">
                Ver el servicio en la web <ExternalLink className="size-3.5" />
              </a>
            )}
          </Card>

          {q.files.length > 0 && (
            <Card title={`Archivos (${q.files.length})`}>
              <ul className="space-y-2">
                {q.files.map((f) => (
                  <li key={f.id}>
                    <a href={`/api/admin/quotes/${q.id}/files/${f.id}`} className="flex items-center gap-3 rounded bg-liner p-3 hover:bg-liner-deep">
                      <FileText className="size-5 shrink-0 text-slate" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{f.originalName}</span>
                        <span className="text-xs text-slate">{fileSize(f.sizeBytes)}</span>
                      </span>
                      <Download className="size-4 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Cliente">
            <dl className="space-y-3 text-[0.95rem]">
              <div>
                <dt className="text-xs text-slate">Nombre</dt>
                <dd className="font-semibold">{q.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">WhatsApp</dt>
                <dd className="tabular font-semibold">{q.phone}</dd>
              </div>
              {q.email && (
                <div>
                  <dt className="text-xs text-slate">Email</dt>
                  <dd className="break-all font-semibold">{q.email}</dd>
                </div>
              )}
              {q.city && (
                <div>
                  <dt className="text-xs text-slate">Localidad</dt>
                  <dd className="font-semibold">{q.city}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Notas internas">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sólo las ve el equipo: medidas tomadas, colores, seña…" />
            <Btn size="sm" className="mt-2" onClick={() => update.mutate({ adminNotes: notes.trim() || null })} disabled={update.isPending || notes === (q.adminNotes ?? '')}>
              Guardar notas
            </Btn>
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
              {q.events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className={cn('absolute -left-[1.4rem] top-1 size-2.5 rounded-full ring-2 ring-white', ev.type === 'status' ? 'bg-ink' : ev.type === 'whatsapp' ? 'bg-lime' : 'bg-smoke')} aria-hidden="true" />
                  <p className="text-sm font-semibold">{ev.note ?? ev.type}</p>
                  <p className="text-xs text-slate">
                    {formatDateTime(ev.createdAt)}
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
    </>
  );
}
