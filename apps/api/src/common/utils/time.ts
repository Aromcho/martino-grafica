export const STORE_TZ = 'America/Argentina/Buenos_Aires';

/** Devuelve { weekday 0-6, minutes desde medianoche, ymd } en la zona horaria del taller */
export function nowInStoreTz(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdays[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    month: Number(get('month')),
    day: Number(get('day')),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
