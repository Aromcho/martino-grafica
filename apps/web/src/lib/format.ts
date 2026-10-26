import type { DeliveryMethod, QuoteStatus } from './types';

/** $150.432 (pesos argentinos, sin decimales) */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return '$' + Math.round(n).toLocaleString('es-AR');
}

/** 120 → "120", 12.5 → "12,5" */
export function num(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const v = Number(n);
  return Number.isInteger(v) ? v.toLocaleString('es-AR') : v.toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

/** Medida legible: 120 × 60 cm, o 2,4 × 1,2 m si es grande */
export function measure(w?: number | string | null, h?: number | string | null): string {
  const a = Number(w);
  const b = Number(h);
  if (!a || !b) return '';
  if (a >= 200 || b >= 200) return `${num(a / 100)} × ${num(b / 100)} m`;
  return `${num(a)} × ${num(b)} cm`;
}

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  PICKUP: 'Retiro en el taller',
  INSTALL: 'Con colocación',
  SHIPPING: 'Envío',
};

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUOTED: 'Presupuestado',
  APPROVED: 'Aprobado',
  IN_PRODUCTION: 'En producción',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export const STATUS_FLOW: QuoteStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'READY', 'DELIVERED'];

/** Link de WhatsApp con mensaje opcional */
export function waLink(phone: string | null | undefined, text?: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** "+54 11 5063-3206" para mostrar */
export function prettyPhone(phone: string | null | undefined): string {
  return phone ?? '';
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-03:00`) : new Date(iso);
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ...opts }).format(d);
}

export const monthYear = (iso: string | null | undefined) => formatDate(iso, { month: 'long', year: 'numeric' });

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "hace 5 min", "hace 2 h", "hace 3 días" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  const days = Math.round(diff / 86400);
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  return formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('es-AR')} ${n === 1 ? one : many}`;
}

export function fileSize(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Quita acentos y pasa a minúsculas: para búsquedas locales */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Agrupa días consecutivos con el mismo horario: "Lunes a viernes: 9:00 a 13:00 y 16:00 a 20:00" */
export function groupWeek(week: { weekday: number; label: string; ranges: { opens: string; closes: string }[] }[]) {
  const key = (r: { opens: string; closes: string }[]) => r.map((x) => `${x.opens}-${x.closes}`).join(',');
  const groups: { from: string; to: string; weekdays: number[]; text: string; k: string }[] = [];
  for (const d of week) {
    const text = d.ranges.length ? d.ranges.map((r) => `${r.opens} a ${r.closes}`).join(' y ') : 'Cerrado';
    const k = key(d.ranges);
    const last = groups[groups.length - 1];
    if (last && last.k === k) {
      last.to = d.label;
      last.weekdays.push(d.weekday);
    } else groups.push({ from: d.label, to: d.label, weekdays: [d.weekday], text, k });
  }
  return groups.map((g) => ({
    label: g.from === g.to ? g.from : g.weekdays.length === 2 ? `${g.from} y ${g.to.toLowerCase()}` : `${g.from} a ${g.to.toLowerCase()}`,
    weekdays: g.weekdays,
    text: g.text,
  }));
}

/** Precio unitario según la cantidad (escalas publicadas por el taller) */
export function tierFor<T extends { minQty: number; price: number }>(tiers: T[], qty: number): T | undefined {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let hit = sorted[0];
  for (const t of sorted) if (qty >= t.minQty) hit = t;
  return hit;
}

/** Línea de precio para tarjetas: "Desde $16.000 por unidad" o "Presupuesto según medida" */
export function priceLine(p: { priceFrom: number | null; priceTiers: { price: number }[]; unit: string; quoteMode: 'AREA' | 'UNITS' | 'CUSTOM' }) {
  const from = p.priceTiers.length ? Math.min(...p.priceTiers.map((t) => t.price)) : p.priceFrom;
  if (from) return `Desde ${money(from)} por ${p.unit}`;
  if (p.quoteMode === 'AREA') return 'Presupuesto según la medida';
  if (p.quoteMode === 'UNITS') return 'Presupuesto según la cantidad';
  return 'Presupuesto a medida';
}

/** Celular argentino listo para wa.me: "011 15 5063-3206" → "5491150633206" (igual que la API) */
export function waNumberAr(raw: string | null | undefined): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  }
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    for (const n of [2, 3, 4]) {
      if (d.slice(n, n + 2) === '15') {
        d = d.slice(0, n) + d.slice(n + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : d;
}
