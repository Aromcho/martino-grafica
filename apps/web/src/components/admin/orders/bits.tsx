'use client';

import { AlarmClock, CalendarDays, Check, CircleDollarSign, Truck, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/admin/ui';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { dueInfo, ORDER_STATUS_LABEL, paymentText } from '@/lib/orders';
import type { WorkOrder, WorkOrderStatus } from '@/lib/types';

type Tone = NonNullable<Parameters<typeof Badge>[0]['tone']>;

export const ORDER_TONE: Record<WorkOrderStatus, Tone> = {
  TO_CONFIRM: 'warn',
  PENDING: 'cut',
  IN_PROGRESS: 'ink',
  READY: 'lime',
  DELIVERED: 'ok',
  CANCELLED: 'red',
};

/** Color de cada etapa: el punto de la columna y el borde de la tarjeta */
export const ORDER_DOT: Record<WorkOrderStatus, string> = {
  TO_CONFIRM: 'bg-warn',
  PENDING: 'bg-cut',
  IN_PROGRESS: 'bg-ink',
  READY: 'bg-lime-deep',
  DELIVERED: 'bg-ok',
  CANCELLED: 'bg-danger',
};

export function OrderStatusBadge({ status, className }: { status: WorkOrderStatus; className?: string }) {
  return (
    <Badge tone={ORDER_TONE[status]} className={className}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

const PAY_STYLE = {
  PAID: 'bg-[#dcf5e6] text-[#145c33]',
  PARTIAL: 'bg-[#fff3d6] text-[#7a5200]',
  UNPAID: 'bg-[#fde8e6] text-[#912018]',
  NO_PRICE: 'bg-liner text-slate',
} as const;

/** Cómo viene el pago: pagado, señado (con lo que resta) o sin seña. `compact` para las tarjetas del tablero. */
export function PaymentPill({ order, className, compact }: { order: Pick<WorkOrder, 'payment' | 'total' | 'paid' | 'balance'>; className?: string; compact?: boolean }) {
  const full = paymentText(order);
  const text = !compact ? full : order.payment === 'PAID' ? 'Pagado' : order.payment === 'PARTIAL' ? `Resta ${money(order.balance)}` : full;
  return (
    <span title={compact ? full : undefined} className={cn('tabular inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold', PAY_STYLE[order.payment], className)}>
      {order.payment === 'PAID' ? <Check className="size-3 shrink-0" strokeWidth={3} /> : <CircleDollarSign className="size-3 shrink-0" />}
      <span className="truncate">{text}</span>
    </span>
  );
}

const DUE_STYLE = {
  late: 'bg-danger text-white',
  today: 'bg-ink text-lime',
  soon: 'bg-[#fff3d6] text-[#7a5200]',
  later: 'bg-liner text-slate',
  note: 'bg-liner text-slate',
} as const;

export function DueChip({ order, today, className }: { order: Pick<WorkOrder, 'dueDate' | 'dueNote' | 'status'>; today?: string; className?: string }) {
  const due = dueInfo(order, today);
  if (!due) return null;
  const Icon = due.tone === 'late' || due.tone === 'today' ? AlarmClock : CalendarDays;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold', DUE_STYLE[due.tone], className)}>
      <Icon className="size-3" /> <span className="max-w-[9rem] truncate">{due.label}</span>
    </span>
  );
}

export function DeliveryIcon({ delivery, className }: { delivery: WorkOrder['delivery']; className?: string }) {
  if (delivery === 'INSTALL') return <Wrench className={className} aria-label="Con colocación" />;
  if (delivery === 'SHIPPING') return <Truck className={className} aria-label="Envío" />;
  return null;
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
