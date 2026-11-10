import { formatDate, money } from './format';
import type { DeliveryMethod, PaymentMethod, WorkOrder, WorkOrderStatus } from './types';

/** Pedidos del taller: nombres, orden y textos compartidos entre el panel y el seguimiento público */
export const ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  TO_CONFIRM: 'A confirmar',
  PENDING: 'Por hacer',
  IN_PROGRESS: 'En producción',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/** Columnas del tablero, en el orden en que avanza un pedido */
export const BOARD_STATUSES: WorkOrderStatus[] = ['TO_CONFIRM', 'PENDING', 'IN_PROGRESS', 'READY'];
export const ORDER_FLOW: WorkOrderStatus[] = ['TO_CONFIRM', 'PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'];

export const BOARD_HINT: Record<WorkOrderStatus, string> = {
  TO_CONFIRM: 'Falta el OK del cliente',
  PENDING: 'Confirmados, sin empezar',
  IN_PROGRESS: 'En diseño, impresión o corte',
  READY: 'Para retirar o colocar',
  DELIVERED: '',
  CANCELLED: '',
};

export const nextStatus = (s: WorkOrderStatus): WorkOrderStatus | null => {
  const i = ORDER_FLOW.indexOf(s);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
};

/** Texto del botón que pasa el pedido a la etapa siguiente */
export function advanceLabel(o: Pick<WorkOrder, 'status' | 'delivery'>): string | null {
  switch (o.status) {
    case 'TO_CONFIRM':
      return 'Confirmó';
    case 'PENDING':
      return 'Empezar';
    case 'IN_PROGRESS':
      return 'Está listo';
    case 'READY':
      return o.delivery === 'INSTALL' ? 'Colocado' : 'Entregar';
    default:
      return null;
  }
}

export const ORDER_DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  PICKUP: 'Retira en el taller',
  INSTALL: 'Con colocación',
  SHIPPING: 'Envío',
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
];
export const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

/** Trabajos que más se piden en el mostrador (salen de la planilla del taller) */
export const COMMON_JOBS = ['Stickers', 'Calcos', 'Vinilo impreso', 'Vinilo de corte', 'Lona', 'Remeras', 'DTF', 'Ploteo vehicular', 'Ploteo de vidriera', 'Cartel', 'Esmerilado', 'Corpóreas', 'Tarjetas', 'Gorras'];

/** Hoy en el taller (Villa Gesell) como YYYY-MM-DD */
export function todayYmd(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

/** Cómo viene la fecha de entrega: vencido, hoy, mañana o más adelante */
export function dueInfo(o: Pick<WorkOrder, 'dueDate' | 'dueNote' | 'status'>, today = todayYmd()): { label: string; tone: 'late' | 'today' | 'soon' | 'later' | 'note' } | null {
  if (!o.dueDate) return o.dueNote ? { label: o.dueNote, tone: 'note' } : null;
  const closed = o.status === 'DELIVERED' || o.status === 'CANCELLED';
  const diff = daysBetween(today, o.dueDate);
  const date = formatDate(o.dueDate, { weekday: 'short', day: 'numeric', month: 'short' });
  if (closed) return { label: date, tone: 'later' };
  if (diff < 0) return { label: diff === -1 ? 'Venció ayer' : `Venció hace ${-diff} días`, tone: 'late' };
  if (diff === 0) return { label: 'Para hoy', tone: 'today' };
  if (diff === 1) return { label: 'Para mañana', tone: 'soon' };
  return { label: date, tone: diff <= 3 ? 'soon' : 'later' };
}

/** "Pagado", "Seña $20.000 · resta $30.000", "Sin seña · $50.000", "Sin precio" */
export function paymentText(o: Pick<WorkOrder, 'payment' | 'total' | 'paid' | 'balance'>): string {
  switch (o.payment) {
    case 'PAID':
      return `Pagado · ${money(o.total)}`;
    case 'PARTIAL':
      return `Seña ${money(o.paid)} · resta ${money(o.balance)}`;
    case 'UNPAID':
      return `Sin seña · ${money(o.total)}`;
    default:
      return 'Sin precio';
  }
}

/** Fecha en que se tomó: los importados sólo saben el mes */
export function orderedText(o: Pick<WorkOrder, 'orderedAt' | 'source'>): string {
  if (o.source === 'excel') return `Excel · ${formatDate(o.orderedAt, { month: 'long', year: 'numeric' })}`;
  return formatDate(o.orderedAt, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const monthLabel = (ym: string) => {
  const s = formatDate(`${ym}-01`, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
