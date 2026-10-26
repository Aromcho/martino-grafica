'use client';

import { Copy, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Btn, Card, DeleteButton, Field, Input, LoadingBlock, PageHeader, SaveBar, SegmentedTabs, Select, Switch } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery, useMe } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Season } from '@/lib/types';

type Slot = { season: Season; weekday: number; opens: string; closes: string };
type Special = { id: string; date: string; label: string; closed: boolean; opens: string | null; closes: string | null };
type SeasonCfg = { mode: 'AUTO' | Season; summerStart: string; summerEnd: string };
type Data = { slots: Slot[]; special: Special[]; season: SeasonCfg };

const DAYS: [number, string][] = [
  [1, 'Lunes'],
  [2, 'Martes'],
  [3, 'Miércoles'],
  [4, 'Jueves'],
  [5, 'Viernes'],
  [6, 'Sábado'],
  [0, 'Domingo'],
];
const sortSlots = (s: Slot[]) => [...s].sort((a, b) => a.season.localeCompare(b.season) || a.weekday - b.weekday || a.opens.localeCompare(b.opens));
const MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export default function HoursPage() {
  const me = useMe();
  const { data, isLoading } = useAdminQuery<Data>(['admin-hours'], '/admin/hours');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [season, setSeason] = useState<Season>('REGULAR');
  const [cfg, setCfg] = useState<SeasonCfg | null>(null);
  const [error, setError] = useState('');
  const [day, setDay] = useState({ date: '', label: '', closed: true, opens: '09:00', closes: '13:00' });

  useEffect(() => {
    if (!data) return;
    setSlots(sortSlots(data.slots.map(({ season, weekday, opens, closes }) => ({ season, weekday, opens: opens.slice(0, 5), closes: closes.slice(0, 5) }))));
    setCfg(data.season);
  }, [data]);

  const baseSlots = useMemo(() => JSON.stringify(sortSlots((data?.slots ?? []).map(({ season, weekday, opens, closes }) => ({ season, weekday, opens: opens.slice(0, 5), closes: closes.slice(0, 5) })))), [data]);
  const dirty = JSON.stringify(sortSlots(slots)) !== baseSlots;
  const inv = [['admin-hours']];
  const save = useAdminMutation<Slot[]>({ method: 'PUT', path: '/admin/hours', body: (s) => ({ slots: s }), invalidate: inv, success: 'Horarios guardados. Ya se ven en la web.' });
  const saveCfg = useAdminMutation<SeasonCfg>({ method: 'PUT', path: '/admin/settings/season', body: (v) => ({ value: v }), invalidate: inv, success: 'Temporada guardada' });
  const addDay = useAdminMutation<typeof day>({
    method: 'POST',
    path: '/admin/special-days',
    body: (d) => ({ date: d.date, label: d.label.trim(), closed: d.closed, ...(d.closed ? {} : { opens: d.opens, closes: d.closes }) }),
    invalidate: inv,
    success: 'Día especial agregado',
    onSuccess: () => setDay({ date: '', label: '', closed: true, opens: '09:00', closes: '13:00' }),
  });
  const delDay = useAdminMutation<string>({ method: 'DELETE', path: (id) => `/admin/special-days/${id}`, invalidate: inv, success: 'Eliminado' });

  if (isLoading || !cfg) return <LoadingBlock />;

  const of = (wd: number) => slots.filter((s) => s.season === season && s.weekday === wd);
  const update = (wd: number, ranges: Slot[]) => setSlots((all) => sortSlots([...all.filter((s) => !(s.season === season && s.weekday === wd)), ...ranges]));
  const copyToWeekdays = (wd: number) => {
    const src = of(wd);
    setSlots((all) => sortSlots([...all.filter((s) => !(s.season === season && [1, 2, 3, 4, 5].includes(s.weekday))), ...[1, 2, 3, 4, 5].flatMap((d) => src.map((r) => ({ ...r, weekday: d })))]));
  };
  const submit = () => {
    const bad = slots.find((s) => s.closes <= s.opens);
    if (bad) return setError(`Revisá ${DAYS.find((d) => d[0] === bad.weekday)?.[1]}: la franja ${bad.opens} a ${bad.closes} cierra antes de abrir.`);
    setError('');
    save.mutate(slots);
  };
  const hasSummer = slots.some((s) => s.season === 'SUMMER');
  const isAdmin = me.data?.role === 'ADMIN';

  return (
    <>
      <PageHeader title="Horarios" text="Con esto la web muestra «Abierto ahora», cuándo abre y el horario de cada día. También se publica para Google." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card
          className="min-w-0"
          title="Semana"
          actions={
            <SegmentedTabs
              value={season}
              onChange={setSeason}
              options={[
                { value: 'REGULAR', label: 'Resto del año' },
                { value: 'SUMMER', label: 'Verano' },
              ]}
            />
          }
        >
          {season === 'SUMMER' && !hasSummer && <p className="mb-4 rounded bg-liner p-3 text-sm text-slate">Si el verano no tiene horario propio, dejalo vacío: se usa el del resto del año.</p>}
          <ul className="divide-y divide-black/8">
            {DAYS.map(([wd, label]) => {
              const ranges = of(wd);
              const open = ranges.length > 0;
              return (
                <li key={wd} className="py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex shrink-0 items-center gap-3 sm:w-36 sm:pt-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={open}
                        aria-label={`${label}: ${open ? 'abierto' : 'cerrado'}`}
                        onClick={() => update(wd, open ? [] : [{ season, weekday: wd, opens: '09:00', closes: '13:00' }])}
                        className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', open ? 'bg-ink' : 'bg-black/15')}
                      >
                        <span className={cn('absolute top-0.5 size-5 rounded-full transition-all', open ? 'left-[1.15rem] bg-lime' : 'left-0.5 bg-white')} />
                      </button>
                      <span className="font-bold">{label}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {!open && <p className="text-sm text-slate max-sm:hidden sm:pt-2">Cerrado</p>}
                      {ranges.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input type="time" value={r.opens} onChange={(e) => update(wd, ranges.map((x, k) => (k === i ? { ...x, opens: e.target.value } : x)))} className="h-10 w-[7.5rem]" aria-label={`${label}, abre`} />
                          <span className="text-slate">a</span>
                          <Input type="time" value={r.closes} onChange={(e) => update(wd, ranges.map((x, k) => (k === i ? { ...x, closes: e.target.value } : x)))} className="h-10 w-[7.5rem]" aria-label={`${label}, cierra`} />
                          <button type="button" onClick={() => update(wd, ranges.filter((_, k) => k !== i))} className="grid size-9 place-items-center rounded-md text-slate hover:bg-black/5" aria-label="Quitar franja">
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                      {open && (
                        <div className="flex flex-wrap gap-1">
                          <Btn size="sm" variant="ghost" onClick={() => update(wd, [...ranges, { season, weekday: wd, opens: '16:00', closes: '20:00' }])}>
                            <Plus className="size-4" /> Otra franja
                          </Btn>
                          {wd >= 1 && wd <= 5 && (
                            <Btn size="sm" variant="ghost" onClick={() => copyToWeekdays(wd)}>
                              <Copy className="size-4" /> Copiar a lunes–viernes
                            </Btn>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {error && (
            <p className="mt-3 rounded bg-[#fde8e6] px-3 py-2 text-sm font-semibold text-[#912018]" role="alert">
              {error}
            </p>
          )}
        </Card>

        <div className="min-w-0 space-y-5">
          <Card title="Temporada">
            <div className="space-y-4">
              <Field label="Qué horario se usa" hint={!isAdmin ? 'Sólo un administrador puede cambiarlo' : undefined}>
                <Select value={cfg.mode} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, mode: e.target.value as SeasonCfg['mode'] })}>
                  <option value="AUTO">Automático según las fechas</option>
                  <option value="REGULAR">Siempre el del resto del año</option>
                  <option value="SUMMER">Siempre el de verano</option>
                </Select>
              </Field>
              {cfg.mode === 'AUTO' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Verano desde" hint="MM-DD">
                    <Input value={cfg.summerStart} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, summerStart: e.target.value })} placeholder="12-15" />
                  </Field>
                  <Field label="Hasta" hint="MM-DD">
                    <Input value={cfg.summerEnd} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, summerEnd: e.target.value })} placeholder="03-15" />
                  </Field>
                </div>
              )}
              {isAdmin && (
                <Btn size="sm" disabled={saveCfg.isPending || (cfg.mode === 'AUTO' && !(MD.test(cfg.summerStart) && MD.test(cfg.summerEnd)))} onClick={() => saveCfg.mutate(cfg)}>
                  Guardar temporada
                </Btn>
              )}
            </div>
          </Card>

          <Card title="Feriados y días especiales">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (day.date && day.label.trim()) addDay.mutate(day);
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2">
                <Input type="date" value={day.date} onChange={(e) => setDay({ ...day, date: e.target.value })} aria-label="Fecha" />
                <Input value={day.label} onChange={(e) => setDay({ ...day, label: e.target.value })} placeholder="Feriado, inventario…" aria-label="Motivo" maxLength={80} />
              </div>
              <Switch label="Cerrado todo el día" checked={day.closed} onChange={(v) => setDay({ ...day, closed: v })} />
              {!day.closed && (
                <div className="flex items-center gap-2">
                  <Input type="time" value={day.opens} onChange={(e) => setDay({ ...day, opens: e.target.value })} className="h-10 w-[7.5rem]" aria-label="Abre" />
                  <span className="text-slate">a</span>
                  <Input type="time" value={day.closes} onChange={(e) => setDay({ ...day, closes: e.target.value })} className="h-10 w-[7.5rem]" aria-label="Cierra" />
                </div>
              )}
              <Btn size="sm" type="submit" disabled={!day.date || !day.label.trim() || addDay.isPending}>
                <Plus className="size-4" /> Agregar
              </Btn>
            </form>
            {(data?.special ?? []).length > 0 && (
              <ul className="mt-4 divide-y divide-black/8 border-t border-black/8">
                {data!.special.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{d.label}</span>
                      <span className="block text-sm text-slate">
                        {formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} · {d.closed ? 'Cerrado' : `${d.opens?.slice(0, 5)} a ${d.closes?.slice(0, 5)}`}
                      </span>
                    </span>
                    <DeleteButton compact onConfirm={() => delDay.mutate(d.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <SaveBar dirty={dirty} saving={save.isPending} onSave={submit} onReset={() => setSlots(JSON.parse(baseSlots))} label="Guardar horarios" />
    </>
  );
}
