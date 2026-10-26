'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/format';

/** Pedidos por día, últimos 30 días: una serie en barras finas, con el valor al pasar o tocar */
export function QuotesChart({ daily }: { daily: { day: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const map = new Map(daily.map((d) => [String(d.day).slice(0, 10), Number(d.count)]));
    const out: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(Date.now() - i * 864e5));
      out.push({ day: key, count: map.get(key) ?? 0 });
    }
    return out;
  }, [daily]);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, d) => a + d.count, 0);
  const W = 600;
  const H = 130;
  const slot = W / days.length;
  const bw = slot - 2;
  const h = hover !== null ? days[hover] : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate">Pedidos por día, últimos 30 días</p>
        <p className="tabular text-sm font-bold text-ink" aria-live="polite">
          {h ? `${formatDate(h.day)}: ${h.count}` : `${total} en total`}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 w-full touch-none" role="img" aria-label={`Pedidos por día: ${total} en los últimos 30 días`} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={H - (H - 8) * f} y2={H - (H - 8) * f} stroke="#e2e7eb" strokeDasharray="3 4" />
        ))}
        <line x1="0" x2={W} y1={H} y2={H} stroke="#c3ced8" />
        {days.map((d, i) => {
          const bh = d.count ? Math.max(4, (d.count / max) * (H - 8)) : 0;
          const x = i * slot + 1;
          const r = Math.min(4, bw / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {bh > 0 && <path d={`M${x},${H} v${-(bh - r)} q0,-${r} ${r},-${r} h${bw - 2 * r} q${r},0 ${r},${r} v${bh - r} z`} fill={hover === i ? '#555c63' : '#000'} />}
            </g>
          );
        })}
        <text x="0" y={H + 15} fontSize="11" fill="#555c63">
          {formatDate(days[0].day)}
        </text>
        <text x={W} y={H + 15} fontSize="11" fill="#555c63" textAnchor="end">
          Hoy
        </text>
      </svg>
    </div>
  );
}
