'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Btn, control, EditorDrawer, Field, Input, MoneyInput, Switch, Textarea } from '@/components/admin/ui';
import { useAdminMutation } from '@/lib/admin';
import { get } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { formatDate, money, plural } from '@/lib/format';
import { COMMON_JOBS, ORDER_DELIVERY_LABEL, PAYMENT_METHODS, todayYmd } from '@/lib/orders';
import type { DeliveryMethod, OrderCustomer, PaymentMethod, WorkOrderDetail } from '@/lib/types';
import { useDebounced } from './bits';
import { TrackShare } from './share';

interface Form {
  customerName: string;
  phone: string;
  title: string;
  details: string;
  delivery: DeliveryMethod;
  dueDate: string;
  dueNote: string;
  total: number | null;
  deposit: number | null;
  depositMethod: PaymentMethod;
  notes: string;
  toConfirm: boolean;
}

const EMPTY: Form = {
  customerName: '',
  phone: '',
  title: '',
  details: '',
  delivery: 'PICKUP',
  dueDate: '',
  dueNote: '',
  total: null,
  deposit: null,
  depositMethod: 'EFECTIVO',
  notes: '',
  toConfirm: false,
};

const fromOrder = (o: WorkOrderDetail): Form => ({
  ...EMPTY,
  customerName: o.customerName,
  phone: o.phone ?? '',
  title: o.title,
  details: o.details ?? '',
  delivery: o.delivery,
  dueDate: o.dueDate ?? '',
  dueNote: o.dueNote ?? '',
  total: o.total,
  notes: o.notes ?? '',
});

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('h-8 shrink-0 rounded-md px-2.5 text-[0.82rem] font-bold transition-colors', active ? 'bg-ink text-lime' : 'bg-liner text-ink hover:bg-liner-deep')}
    >
      {children}
    </button>
  );
}

function Group({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <p className="mb-1.5 text-sm font-semibold text-ink">
        {label} {optional && <span className="font-normal text-slate">(opcional)</span>}
      </p>
      {children}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 flex items-center gap-2.5 text-[0.95rem] font-extrabold text-ink">
        <span className="tabular grid size-6 place-items-center rounded bg-lime text-xs">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Alta de un pedido en el mostrador (o edición de uno que ya está). Pensado para cargarlo mientras
 * el cliente espera: nombre, qué pidió, para cuándo y cuánto deja. Al guardar muestra el link de seguimiento.
 */
export function OrderDrawer({ open, onClose, order }: { open: boolean; onClose: () => void; order?: WorkOrderDetail }) {
  const editing = !!order;
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(EMPTY);
  const [created, setCreated] = useState<WorkOrderDetail | null>(null);
  const [focusName, setFocusName] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(order ? fromOrder(order) : EMPTY);
    setCreated(null);
    if (!order) setTimeout(() => nameRef.current?.focus(), 350);
  }, [open, order]);

  // Clientes que ya pidieron: completa el nombre y el WhatsApp
  const term = useDebounced(f.customerName.trim(), 250);
  const suggestions = useQuery({
    queryKey: ['order-customers', term],
    queryFn: () => get<OrderCustomer[]>(`/admin/orders/customers?q=${encodeURIComponent(term)}`),
    enabled: open && !editing && term.length >= 2,
    staleTime: 60_000,
  });
  const matches = (suggestions.data ?? []).filter((c) => c.name.toLowerCase() !== f.customerName.trim().toLowerCase() || (c.phone && !f.phone));

  const body = () => ({
    customerName: f.customerName,
    phone: f.phone,
    title: f.title,
    details: f.details,
    delivery: f.delivery,
    dueDate: f.dueDate,
    dueNote: f.dueDate ? '' : f.dueNote,
    total: f.total,
    notes: f.notes,
  });
  const create = useAdminMutation<void, WorkOrderDetail>({
    method: 'POST',
    path: '/admin/orders',
    body: () => ({ ...body(), deposit: f.deposit ?? 0, depositMethod: f.depositMethod, status: f.toConfirm ? 'TO_CONFIRM' : 'PENDING' }),
    invalidate: [['orders']],
    success: false,
    onSuccess: (res) => setCreated(res),
  });
  const update = useAdminMutation<void, WorkOrderDetail>({
    method: 'PATCH',
    path: `/admin/orders/${order?.id}`,
    body,
    invalidate: [['orders'], ['order', order?.id]],
    success: 'Pedido actualizado',
    onSuccess: onClose,
  });
  const saving = create.isPending || update.isPending;

  const depositTooBig = f.total != null && (f.deposit ?? 0) > f.total;
  const valid = f.customerName.trim().length >= 2 && f.title.trim().length >= 1 && !depositTooBig;
  const rest = f.total != null ? Math.max(f.total - (f.deposit ?? 0), 0) : null;
  const dates = [
    { label: 'Hoy', value: todayYmd() },
    { label: 'Mañana', value: todayYmd(1) },
    { label: 'En 3 días', value: todayYmd(3) },
    { label: 'En una semana', value: todayYmd(7) },
  ];
  const addJob = (job: string) => set('title', !f.title.trim() ? job : f.title.toLowerCase().includes(job.toLowerCase()) ? f.title : `${f.title.trim()} + ${job}`);

  if (created) {
    return (
      <EditorDrawer open={open} onClose={onClose} title={`Pedido ${created.ref} anotado`}>
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-md bg-ink p-5 text-white">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime text-ink">
              <Check className="size-6" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="tabular display text-2xl leading-none text-lime">{created.ref}</p>
              <p className="mt-1.5 truncate font-bold">
                {created.customerName} · {created.title}
              </p>
              <p className="tabular mt-0.5 text-sm text-smoke">
                {created.total != null ? `Total ${money(created.total)}` : 'Sin precio todavía'}
                {created.paid > 0 ? ` · dejó ${money(created.paid)}` : ''}
                {created.balance > 0 && created.paid > 0 ? ` · resta ${money(created.balance)}` : ''}
                {created.dueDate ? ` · para el ${formatDate(created.dueDate, { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-[0.95rem] font-extrabold">Pasale el seguimiento al cliente</h3>
            <p className="mb-3 mt-1 text-sm text-slate">Con este link ve en qué está su pedido, sin tener que escribir ni llamar.</p>
            <TrackShare order={created} onSent={() => qc.invalidateQueries({ queryKey: ['order', created.id] })} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-black/10 pt-5">
            <Btn
              onClick={() => {
                setCreated(null);
                setF(EMPTY);
                setTimeout(() => nameRef.current?.focus(), 100);
              }}
            >
              <Plus className="size-4" /> Cargar otro
            </Btn>
            <Link href={`/admin/pedidos/${created.id}`} onClick={onClose} className="inline-flex h-11 items-center rounded-lg bg-white px-4.5 text-[0.95rem] font-bold ring-1 ring-black/15 hover:ring-black/40">
              Ver el pedido
            </Link>
            <Btn variant="ghost" onClick={onClose}>
              Cerrar
            </Btn>
          </div>
        </div>
      </EditorDrawer>
    );
  }

  return (
    <EditorDrawer
      open={open}
      onClose={onClose}
      title={editing ? `Editar pedido ${order.ref}` : 'Nuevo pedido'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="tabular min-w-0 truncate text-sm text-slate">
            {depositTooBig ? <span className="font-bold text-danger">La seña supera el total</span> : !editing && rest != null ? (rest > 0 ? `Resta cobrar ${money(rest)}` : 'Queda pago') : ''}
          </p>
          <Btn variant="lime" disabled={!valid || saving} onClick={() => (editing ? update.mutate() : create.mutate())}>
            <Check className="size-4" strokeWidth={3} /> {editing ? 'Guardar cambios' : 'Anotar pedido'}
          </Btn>
        </div>
      }
    >
      <form
        className="space-y-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !saving) (editing ? update : create).mutate();
        }}
      >
        <Section n={1} title="Cliente">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Field label="Nombre o comercio">
              <div className="relative">
                <Input
                  ref={nameRef}
                  value={f.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                  onFocus={() => setFocusName(true)}
                  onBlur={() => setTimeout(() => setFocusName(false), 150)}
                  placeholder="Juan Pérez, Panadería El Sol…"
                  autoComplete="off"
                  maxLength={80}
                />
                {focusName && matches.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/12">
                    {matches.map((c) => (
                      <li key={c.name}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setF((p) => ({ ...p, customerName: c.name, phone: c.phone ?? p.phone }));
                            setFocusName(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-liner"
                        >
                          <UserRound className="size-4 shrink-0 text-slate" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{c.name}</span>
                            <span className="tabular block truncate text-xs text-slate">
                              {plural(c.orders, 'pedido', 'pedidos')}
                              {c.phone ? ` · ${c.phone}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
            <Field label="WhatsApp" optional>
              <Input value={f.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" placeholder="2255 41-8960" autoComplete="off" maxLength={24} />
            </Field>
          </div>
        </Section>

        <Section n={2} title="El pedido">
          <Field label="¿Qué pidió?">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Stickers, lona, ploteo vehicular…" maxLength={160} />
          </Field>
          <div className="!mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Trabajos frecuentes">
            {COMMON_JOBS.map((j) => (
              <Chip key={j} active={f.title.toLowerCase().includes(j.toLowerCase())} onClick={() => addJob(j)}>
                {j}
              </Chip>
            ))}
          </div>
          <Field label="Especificaciones" optional hint="Medidas, cantidad, colores, material. El cliente lo ve en su seguimiento.">
            <Textarea rows={3} value={f.details} onChange={(e) => set('details', e.target.value)} placeholder="1 m² de stickers de 6 cm, troquelados, laminado brillante" maxLength={4000} />
          </Field>
          <Group label="Entrega">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ORDER_DELIVERY_LABEL) as DeliveryMethod[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={f.delivery === d}
                  onClick={() => set('delivery', d)}
                  className={cn('h-11 rounded-lg px-2 text-sm font-bold ring-1 transition-colors', f.delivery === d ? 'bg-ink text-lime ring-ink' : 'bg-white text-ink ring-black/15 hover:ring-black/40')}
                >
                  {d === 'PICKUP' ? 'Retira' : ORDER_DELIVERY_LABEL[d]}
                </button>
              ))}
            </div>
          </Group>
          <Group label="¿Para cuándo?" optional>
            <div className="flex flex-wrap items-center gap-1.5">
              <input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={cn(control, 'h-11 w-auto min-w-[10.5rem]')} aria-label="Fecha de entrega" />
              {dates.map((d) => (
                <Chip key={d.label} active={f.dueDate === d.value} onClick={() => setF((p) => ({ ...p, dueDate: p.dueDate === d.value ? '' : d.value, dueNote: '' }))}>
                  {d.label}
                </Chip>
              ))}
              <Chip active={!f.dueDate && f.dueNote === 'A confirmar'} onClick={() => setF((p) => ({ ...p, dueDate: '', dueNote: p.dueNote === 'A confirmar' ? '' : 'A confirmar' }))}>
                A confirmar
              </Chip>
            </div>
          </Group>
        </Section>

        <Section n={3} title={editing ? 'Precio' : 'Precio y seña'}>
          <div className={cn('grid gap-4', !editing && 'sm:grid-cols-2')}>
            <Field label="Total" hint={editing ? 'Los cobros se cargan desde la ficha del pedido.' : 'Si todavía no hay precio, dejalo vacío.'}>
              <MoneyInput value={f.total} onChange={(v) => set('total', v)} placeholder="0" />
            </Field>
            {!editing && (
              <div className="min-w-0">
                <Field label="Seña o pago" error={depositTooBig ? 'No puede ser mayor que el total' : undefined}>
                  <MoneyInput value={f.deposit} onChange={(v) => set('deposit', v)} placeholder="0" />
                </Field>
                {f.total ? (
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Atajos de seña">
                    <Chip active={!f.deposit} onClick={() => set('deposit', null)}>
                      Sin seña
                    </Chip>
                    <Chip active={f.deposit === Math.round(f.total / 2)} onClick={() => set('deposit', Math.round(f.total! / 2))}>
                      La mitad
                    </Chip>
                    <Chip active={f.deposit === f.total} onClick={() => set('deposit', f.total)}>
                      Pagó todo
                    </Chip>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {!editing && (f.deposit ?? 0) > 0 && (
            <Group label="¿Cómo pagó?">
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <Chip key={m.value} active={f.depositMethod === m.value} onClick={() => set('depositMethod', m.value)}>
                    {m.label}
                  </Chip>
                ))}
              </div>
            </Group>
          )}
          {!editing && (
            <div className="rounded-lg bg-liner px-3.5 py-1">
              <Switch checked={f.toConfirm} onChange={(v) => set('toConfirm', v)} label="Falta que el cliente confirme" hint="Queda en «A confirmar» hasta que dé el OK (presupuesto pasado, diseño por aprobar)." />
            </div>
          )}
          <Field label="Notas internas" optional hint="Sólo las ve el equipo.">
            <Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Trae la remera él, llamar antes de ir a colocar…" maxLength={4000} />
          </Field>
        </Section>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </EditorDrawer>
  );
}
