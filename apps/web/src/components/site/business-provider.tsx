'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BusinessInfo, HoursStatus, PublicBusiness } from '@/lib/types';

interface Ctx {
  info: BusinessInfo | null;
  hours: HoursStatus | null;
  counts: PublicBusiness['counts'] | null;
}

const BusinessCtx = createContext<Ctx>({ info: null, hours: null, counts: null });

/** Datos del taller (contacto + estado abierto/cerrado). El estado se refresca cada minuto. */
export function BusinessProvider({ initial, children }: { initial: PublicBusiness | null; children: ReactNode }) {
  const [hours, setHours] = useState<HoursStatus | null>(initial?.hours ?? null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch('/api/hours', { cache: 'no-store' });
        if (res.ok && alive) setHours(await res.json());
      } catch {
        /* sin conexión: queda el último estado */
      }
    };
    const id = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return <BusinessCtx.Provider value={{ info: initial?.info ?? null, hours, counts: initial?.counts ?? null }}>{children}</BusinessCtx.Provider>;
}

export const useBusiness = () => useContext(BusinessCtx);

/** Texto del estado: "Abierto ahora, cierra 20:00" / "Cerrado, abre mañana 9:00" */
export function statusText(h: HoursStatus | null): { state: 'open' | 'soon' | 'closed' | 'unknown'; short: string; long: string } {
  if (!h || !h.configured) return { state: 'unknown', short: 'Consultá horarios', long: 'Escribinos por WhatsApp y te respondemos' };
  if (h.isOpen) {
    return h.closingSoon
      ? { state: 'soon', short: `Cierra a las ${h.closesAt}`, long: `Abierto, cerramos a las ${h.closesAt}` }
      : { state: 'open', short: 'Abierto ahora', long: `Abierto ahora, hasta las ${h.closesAt}` };
  }
  if (h.todaySpecial?.closed) return { state: 'closed', short: 'Cerrado hoy', long: `Hoy cerrado: ${h.todaySpecial.label}` };
  const next = h.next ? (h.next.dayLabel === 'Hoy' ? `abre hoy a las ${h.next.opens}` : `abre ${h.next.dayLabel.toLowerCase()} a las ${h.next.opens}`) : '';
  return { state: 'closed', short: 'Cerrado ahora', long: next ? `Cerrado, ${next}` : 'Cerrado ahora' };
}
