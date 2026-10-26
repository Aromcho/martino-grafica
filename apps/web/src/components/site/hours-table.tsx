'use client';

import { cn } from '@/lib/cn';
import { groupWeek, waLink } from '@/lib/format';
import { statusText, useBusiness } from './business-provider';
import { Led } from './status-pill';

/** Horarios agrupados por días, con el día de hoy marcado y el estado en vivo */
export function HoursTable({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const { hours, info } = useBusiness();
  const s = statusText(hours);
  const muted = tone === 'dark' ? 'text-smoke' : 'text-slate';

  if (!hours?.configured) {
    return (
      <div className={className}>
        <p className="flex items-center gap-2 font-bold">
          <Led state="unknown" /> Horarios a confirmar
        </p>
        <p className={cn('mt-2 text-sm', muted)}>Todavía no publicamos los horarios. Escribinos por WhatsApp y coordinamos cuándo pasar por el taller.</p>
        {info?.whatsapp && (
          <a href={waLink(info.whatsapp, 'Hola, ¿en qué horario puedo pasar por el taller?')} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-bold text-lime underline-offset-4 hover:underline">
            Consultar horario por WhatsApp
          </a>
        )}
      </div>
    );
  }

  const groups = groupWeek(hours.weeks[hours.season]);
  return (
    <div className={className}>
      <p className="mb-3 flex items-center gap-2 font-bold">
        <Led state={s.state} /> {s.long}
      </p>
      {hours.hasSummer && <p className={cn('mb-2 text-sm', muted)}>{hours.season === 'SUMMER' ? 'Horario de verano' : 'Horario del resto del año'}</p>}
      <dl className="divide-y divide-current/10">
        {groups.map((g) => {
          const today = g.weekdays.includes(hours.weekday);
          return (
            <div key={g.label} className={cn('flex justify-between gap-4 py-2 text-[0.95rem]', today && 'font-bold')}>
              <dt>
                {g.label}
                {today && <span className="ml-2 rounded bg-lime px-1.5 py-0.5 text-[0.7rem] font-bold text-ink">Hoy</span>}
              </dt>
              <dd className={cn('tabular text-right', g.text === 'Cerrado' && muted)}>{g.text}</dd>
            </div>
          );
        })}
      </dl>
      {hours.upcomingSpecialDays.length > 0 && (
        <ul className={cn('mt-3 space-y-1 text-sm', muted)}>
          {hours.upcomingSpecialDays.slice(0, 3).map((d) => (
            <li key={d.id}>
              {d.date.split('-').reverse().slice(0, 2).join('/')}: {d.label} {d.closed ? '(cerrado)' : d.opens ? `(${d.opens} a ${d.closes})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
