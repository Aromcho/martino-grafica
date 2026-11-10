'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, DragOverlay, MouseSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Loader2, PackageCheck, Plus, Search, X } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DeliveryIcon, DueChip, ORDER_DOT, OrderStatusBadge, PaymentPill, useDebounced } from '@/components/admin/orders/bits';
import { OrderDrawer } from '@/components/admin/orders/order-form';
import { Btn, EmptyState, LoadingBlock, PageHeader, SegmentedTabs, Select } from '@/components/admin/ui';
import { useAdminQuery } from '@/lib/admin';
import { get, HttpError, patch } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { money, plural } from '@/lib/format';
import { advanceLabel, BOARD_HINT, BOARD_STATUSES, monthLabel, nextStatus, ORDER_STATUS_LABEL, orderedText } from '@/lib/orders';
import type { OrderBoard, OrderSummary, WorkOrder, WorkOrderList, WorkOrderStatus } from '@/lib/types';

type View = 'active' | 'unpaid' | 'delivered' | 'all';
const VIEWS: View[] = ['active', 'unpaid', 'delivered', 'all'];

// ---------------------------------------------------------------- tarjeta del tablero
function CardBody({ o, today, onAdvance, busy }: { o: WorkOrder; today: string; onAdvance?: () => void; busy?: boolean }) {
  const label = advanceLabel(o);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="tabular text-xs font-bold text-slate">{o.ref}</span>
        <DeliveryIcon delivery={o.delivery} className="size-3.5 text-slate" />
        <DueChip order={o} today={today} className="ml-auto" />
      </div>
      <Link href={`/admin/pedidos/${o.id}`} draggable={false} className="mt-1.5 block after:absolute after:inset-0">
        <span className="block truncate font-bold leading-snug">{o.customerName}</span>
      </Link>
      <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink/75">
        <span className="font-semibold text-ink">{o.title || 'Sin descripción'}</span>
        {o.details ? ` · ${o.details}` : ''}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PaymentPill order={o} compact />
        {label && onAdvance && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdvance();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative z-[1] inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-ink pl-2.5 pr-2 text-xs font-bold text-white transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
            title={`Pasar a «${ORDER_STATUS_LABEL[nextStatus(o.status)!]}»`}
          >
            {label} <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </>
  );
}

const cardClass = 'relative rounded-md bg-white p-3 text-ink ring-1 ring-black/8 transition-shadow hover:shadow-md';

function BoardCard({ o, today, onAdvance, busy }: { o: WorkOrder; today: string; onAdvance: () => void; busy: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: o.id });
  return (
    <li ref={setNodeRef} {...listeners} {...attributes} role="listitem" tabIndex={-1} className={cn(cardClass, 'lg:cursor-grab', isDragging && 'opacity-35')}>
      <CardBody o={o} today={today} onAdvance={onAdvance} busy={busy} />
    </li>
  );
}

function Column({ status, items, today, active, onAdvance, busyId, onNew }: { status: WorkOrderStatus; items: WorkOrder[]; today: string; active: boolean; onAdvance: (o: WorkOrder) => void; busyId: string | null; onNew: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const sum = items.reduce((a, o) => a + (o.total ?? 0), 0);
  return (
    <section ref={setNodeRef} aria-label={ORDER_STATUS_LABEL[status]} className={cn('min-w-0 rounded-lg bg-liner-deep/70 p-2 transition-shadow', !active && 'max-lg:hidden', isOver && 'ring-2 ring-ink')}>
      <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
        <span className={cn('size-2.5 shrink-0 rounded-full', ORDER_DOT[status])} aria-hidden="true" />
        <h2 className="text-[0.95rem] font-extrabold">{ORDER_STATUS_LABEL[status]}</h2>
        <span className="tabular rounded bg-white px-1.5 text-xs font-bold leading-5 text-slate">{items.length}</span>
        {sum > 0 && <span className="tabular ml-auto text-xs font-semibold text-slate">{money(sum)}</span>}
      </header>
      {items.length === 0 ? (
        <div className="rounded-md border-2 border-dashed border-black/12 px-3 py-8 text-center text-sm text-slate">
          <p>{BOARD_HINT[status]}</p>
          {status === 'PENDING' && (
            <button type="button" onClick={onNew} className="mt-2 font-bold text-ink underline underline-offset-4">
              Anotar un pedido
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((o) => (
            <BoardCard key={o.id} o={o} today={today} onAdvance={() => onAdvance(o)} busy={busyId === o.id} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeliveredDrop() {
  const { setNodeRef, isOver } = useDroppable({ id: 'DELIVERED' });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'fixed bottom-5 left-[calc(15.5rem+2.5rem)] right-10 z-50 flex h-20 items-center justify-center gap-2 rounded-lg border-2 border-dashed text-[0.95rem] font-bold shadow-2xl transition-colors max-lg:hidden',
        isOver ? 'border-ok bg-[#dcf5e6] text-[#145c33]' : 'border-white/40 bg-ink text-white',
      )}
    >
      <PackageCheck className="size-5" /> Soltá acá para marcarlo entregado
    </div>
  );
}

// ---------------------------------------------------------------- tablero
function Board({ onNew, focus }: { onNew: () => void; focus: WorkOrderStatus }) {
  const router = useRouter();
  const qc = useQueryClient();
  const board = useAdminQuery<OrderBoard>(['orders', 'board'], '/admin/orders/board', { refetchInterval: 45_000 });
  const [tab, setTab] = useState<WorkOrderStatus>(focus);
  const [dragging, setDragging] = useState<WorkOrder | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }));
  useEffect(() => setTab(focus), [focus]);

  const move = useMutation<WorkOrder, Error, { o: WorkOrder; to: WorkOrderStatus; undo?: boolean }, { prev?: OrderBoard }>({
    mutationFn: ({ o, to }) => patch<WorkOrder>(`/admin/orders/${o.id}`, { status: to }),
    // El cambio se ve al instante; si la API falla, vuelve atrás
    onMutate: async ({ o, to }) => {
      await qc.cancelQueries({ queryKey: ['orders', 'board'] });
      const prev = qc.getQueryData<OrderBoard>(['orders', 'board']);
      qc.setQueryData<OrderBoard>(['orders', 'board'], (d) => {
        if (!d) return d;
        const rest = d.items.filter((x) => x.id !== o.id);
        return { ...d, items: BOARD_STATUSES.includes(to) ? [...rest, { ...o, status: to }] : rest };
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['orders', 'board'], ctx.prev);
      toast.error(err instanceof HttpError ? err.message : 'No se pudo mover el pedido. Probá de nuevo.');
    },
    onSuccess: (res, { o, to, undo }) => {
      if (undo) return;
      const back = { label: 'Deshacer', onClick: () => move.mutate({ o: { ...o, status: to }, to: o.status, undo: true }) };
      if (to === 'DELIVERED' && res.balance > 0) {
        toast.warning(`${o.ref} entregado. Quedan ${money(res.balance)} por cobrar.`, { action: { label: 'Cobrar', onClick: () => router.push(`/admin/pedidos/${o.id}#cobros`) }, duration: 8000 });
      } else toast.success(`${o.ref} · ${o.customerName}: ${ORDER_STATUS_LABEL[to].toLowerCase()}`, { action: back, duration: 6000 });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const by = useMemo(() => {
    const map = Object.fromEntries(BOARD_STATUSES.map((s) => [s, [] as WorkOrder[]])) as Record<WorkOrderStatus, WorkOrder[]>;
    for (const o of board.data?.items ?? []) map[o.status]?.push(o);
    return map;
  }, [board.data]);

  if (board.isLoading || !board.data) return <LoadingBlock />;
  const today = board.data.today;

  if (board.data.items.length === 0)
    return (
      <EmptyState
        title="No hay pedidos en curso"
        text="Cuando un cliente te encargue algo en el local, anotalo acá: queda en el tablero y le podés pasar un link para que siga el estado."
        action={
          <Btn variant="lime" onClick={onNew}>
            <Plus className="size-4" /> Anotar el primer pedido
          </Btn>
        }
      />
    );

  const onDragStart = (e: DragStartEvent) => setDragging(board.data!.items.find((o) => o.id === e.active.id) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    const o = dragging;
    setDragging(null);
    const to = e.over?.id as WorkOrderStatus | undefined;
    if (o && to && to !== o.status) move.mutate({ o, to });
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <SegmentedTabs value={tab} onChange={setTab} options={BOARD_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s], count: by[s].length }))} className="-mx-4 mb-3 px-4 lg:hidden" />
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-4">
        {BOARD_STATUSES.map((s) => (
          <Column key={s} status={s} items={by[s]} today={today} active={tab === s} onAdvance={(o) => move.mutate({ o, to: nextStatus(o.status)! })} busyId={move.isPending ? (move.variables?.o.id ?? null) : null} onNew={onNew} />
        ))}
      </div>
      {dragging && <DeliveredDrop />}
      <p className="mt-3 text-xs text-slate max-lg:hidden">Arrastrá una tarjeta a otra columna para cambiarle el estado, o usá el botón de cada una.</p>
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className={cn(cardClass, 'w-[17rem] rotate-[1.5deg] cursor-grabbing shadow-2xl ring-2 ring-ink')}>
            <CardBody o={dragging} today={today} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ---------------------------------------------------------------- listado (por cobrar, entregados, todos, búsqueda)
function OrdersTable({ view, q, month }: { view: View; q: string; month: string }) {
  const query = useInfiniteQuery({
    queryKey: ['orders', 'list', view, q, month],
    queryFn: ({ pageParam }) => get<WorkOrderList>(`/admin/orders?view=${view}&page=${pageParam}&pageSize=40${q ? `&q=${encodeURIComponent(q)}` : ''}${month ? `&month=${month}` : ''}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isLoading) return <LoadingBlock />;
  if (!items.length)
    return (
      <EmptyState
        title={q ? `Nada con «${q}»` : view === 'unpaid' ? 'Nadie debe nada' : 'No hay pedidos con ese filtro'}
        text={q ? 'Probá con el nombre del cliente, el número de pedido, el teléfono o el trabajo.' : view === 'unpaid' ? 'Todos los pedidos con precio están pagos.' : undefined}
      />
    );

  return (
    <>
      <p className="tabular mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate">
        <span>
          <b className="text-ink">{plural(first!.total, 'pedido', 'pedidos')}</b>
        </span>
        {first!.amount > 0 && (
          <span>
            Total <b className="text-ink">{money(first!.amount)}</b>
          </span>
        )}
        {first!.balance > 0 && (
          <span>
            Por cobrar <b className="text-danger">{money(first!.balance)}</b>
          </span>
        )}
      </p>
      <ul className="space-y-2">
        {items.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/pedidos/${o.id}${view === 'unpaid' ? '#cobros' : ''}`} className="flex gap-3 rounded-md bg-white p-3.5 ring-1 ring-black/8 transition-shadow hover:shadow-md sm:items-center sm:p-4">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tabular text-xs font-bold text-slate">{o.ref}</span>
                  <span className="truncate font-bold">{o.customerName}</span>
                  <OrderStatusBadge status={o.status} />
                  {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && <DueChip order={o} />}
                </span>
                <span className="mt-1 block truncate text-sm text-ink/80">
                  <span className="font-semibold text-ink">{o.title || 'Sin descripción'}</span>
                  {o.details ? ` · ${o.details}` : ''}
                </span>
                <span className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
                  <span>{orderedText(o)}</span>
                  {o.phone && <span>{o.phone}</span>}
                </span>
              </span>
              <span className="tabular flex shrink-0 flex-col items-end gap-1 text-right">
                {o.total != null ? <span className="font-extrabold">{money(o.total)}</span> : <span className="text-sm text-slate">Sin precio</span>}
                {o.balance > 0 && o.status !== 'CANCELLED' ? (
                  <span className="rounded bg-[#fde8e6] px-1.5 py-0.5 text-xs font-bold text-[#912018]">Debe {money(o.balance)}</span>
                ) : o.payment === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#145c33]">
                    <Check className="size-3" strokeWidth={3} /> Pagado
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="mt-5 flex justify-center">
          <Btn variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />} Ver más
          </Btn>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- página
function Kpi({ label, value, sub, onClick, tone, alert }: { label: string; value: string | number; sub: string; onClick: () => void; tone?: 'ink'; alert?: boolean }) {
  const long = typeof value === 'string' && value.length > 6;
  return (
    <button type="button" onClick={onClick} className={cn('flex min-w-0 flex-col items-start rounded-md p-3.5 text-left ring-1 transition-shadow hover:shadow-md sm:p-5', tone === 'ink' ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-black/8')}>
      <span className={cn('block truncate text-sm', tone === 'ink' ? 'text-smoke' : 'text-slate')}>{label}</span>
      <span className={cn('tabular display mt-1.5 flex h-[2.1rem] items-center leading-none', long ? 'text-[1.25rem] sm:text-[1.7rem]' : 'text-[1.9rem] sm:text-[2.1rem]', tone === 'ink' && 'text-lime')}>{value}</span>
      <span className={cn('mt-2 block text-xs', alert ? 'font-bold text-cut' : tone === 'ink' ? 'text-smoke' : 'text-slate')}>{sub}</span>
    </button>
  );
}

function OrdersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('ver') as View | null;
  const [view, setView] = useState<View>(initial && VIEWS.includes(initial) ? initial : 'active');
  const [focus, setFocus] = useState<WorkOrderStatus>('PENDING');
  const [text, setText] = useState('');
  const [month, setMonth] = useState('');
  const [drawer, setDrawer] = useState(params.get('nuevo') === '1');
  const q = useDebounced(text.trim());
  const summary = useAdminQuery<OrderSummary>(['orders', 'summary'], '/admin/orders/summary', { refetchInterval: 60_000 });
  const s = summary.data;

  useEffect(() => {
    router.replace(view === 'active' ? '/admin/pedidos' : `/admin/pedidos?ver=${view}`, { scroll: false });
  }, [view, router]);

  // "N" abre un pedido nuevo (si no se está escribiendo en otro lado)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || el?.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      setDrawer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (v: View, m = '') => {
    setText('');
    setMonth(m);
    setView(v);
  };
  const showBoard = view === 'active' && !q;
  const by = s?.byStatus ?? {};

  return (
    <>
      <PageHeader
        title="Pedidos"
        text="Lo que se encarga en el local: anotalo, seguí en qué está y pasale el link de seguimiento al cliente."
        actions={
          <Btn variant="lime" onClick={() => setDrawer(true)} className="h-12 px-5 text-base">
            <Plus className="size-5" strokeWidth={2.6} /> Nuevo pedido
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          tone="ink"
          label="En curso"
          value={s?.active ?? '–'}
          sub={s?.overdue ? `${plural(s.overdue, 'vencido', 'vencidos')}${s.dueToday ? ` · ${s.dueToday} para hoy` : ''}` : s?.dueToday ? `${s.dueToday} para hoy` : 'Sin atrasos'}
          alert={!!s?.overdue}
          onClick={() => {
            setFocus('PENDING');
            go('active');
          }}
        />
        <Kpi
          label="Listos para entregar"
          value={by.READY ?? (s ? 0 : '–')}
          sub="Para retirar o colocar"
          onClick={() => {
            setFocus('READY');
            go('active');
          }}
        />
        <Kpi label="Por cobrar" value={s ? money(s.unpaid.amount) || '$0' : '–'} sub={s ? (s.unpaid.count ? `En ${plural(s.unpaid.count, 'pedido', 'pedidos')}` : 'Nadie debe nada') : ''} onClick={() => go('unpaid')} />
        <Kpi label={s ? `Cobrado en ${monthLabel(s.month.key).split(' ')[0].toLowerCase()}` : 'Cobrado este mes'} value={s ? money(s.month.collected) || '$0' : '–'} sub={s ? `${plural(s.month.orders, 'pedido', 'pedidos')} · ${money(s.month.amount) || '$0'} vendidos` : ''} onClick={() => go('all', s?.month.key ?? '')} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegmentedTabs
          value={view}
          onChange={(v) => go(v)}
          options={[
            { value: 'active', label: 'En curso', count: s?.active },
            { value: 'unpaid', label: 'Por cobrar', count: s?.unpaid.count },
            { value: 'delivered', label: 'Entregados', count: by.DELIVERED ?? (s ? 0 : undefined) },
            { value: 'all', label: 'Todos', count: s?.all },
          ]}
          className="-mx-4 max-w-[100vw] px-4 sm:mx-0 sm:px-0"
        />
        <label className="relative block min-w-[14rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <span className="sr-only">Buscar pedidos</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar cliente, N° de pedido, teléfono o trabajo" className="h-10 w-full rounded-lg bg-white pl-10 pr-9 text-[0.92rem] outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
          {text && (
            <button type="button" onClick={() => setText('')} className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded hover:bg-black/5" aria-label="Borrar la búsqueda">
              <X className="size-4" />
            </button>
          )}
        </label>
        {!showBoard && (s?.months.length ?? 0) > 0 && (
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="h-10 w-auto" aria-label="Mes en que se tomó">
            <option value="">Todos los meses</option>
            {s!.months.map((m) => (
              <option key={m.month} value={m.month}>
                {monthLabel(m.month)} ({m.count})
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-4">{showBoard ? <Board onNew={() => setDrawer(true)} focus={focus} /> : <OrdersTable view={q && view === 'active' ? 'all' : view} q={q} month={month} />}</div>

      <OrderDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <OrdersPage />
    </Suspense>
  );
}
