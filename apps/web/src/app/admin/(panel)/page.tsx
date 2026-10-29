'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, Eye, ImagePlus, Plus } from 'lucide-react';
import { QuotesChart } from '@/components/admin/quotes-chart';
import { StatusBadge } from '@/components/admin/status';
import { Card, LoadingBlock, PageHeader } from '@/components/admin/ui';
import { WhatsAppIcon } from '@/components/ui/icons';
import { Img } from '@/components/ui/img';
import { useAdminQuery, useMe } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { formatDate, money, timeAgo, waLink, waNumberAr } from '@/lib/format';
import type { AdminStats } from '@/lib/types';

function Tile({ label, value, href, tone, sub }: { label: string; value: string | number; href: string; tone?: 'cut' | 'ink'; sub?: string }) {
  return (
    <Link href={href} className={cn('group rounded-md p-4 ring-1 transition-shadow hover:shadow-md sm:p-5', tone === 'cut' ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-black/8')}>
      <p className={cn('text-sm', tone === 'cut' ? 'text-smoke' : 'text-slate')}>{label}</p>
      <p className={cn('tabular display mt-1.5 leading-none', typeof value === 'string' && value.length > 4 ? 'text-[1.45rem] sm:text-[1.8rem]' : 'text-[2.1rem]', tone === 'cut' && 'text-lime')}>{value}</p>
      {sub && <p className={cn('mt-2 text-xs', tone === 'cut' ? 'text-smoke' : 'text-slate')}>{sub}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const me = useMe();
  const { data: s, isLoading } = useAdminQuery<AdminStats>(['stats'], '/admin/stats', { refetchInterval: 60_000 });
  if (isLoading || !s) return <LoadingBlock />;
  const first = me.data?.name.split(' ')[0];
  const hoursText = !s.hours.configured ? 'Sin cargar' : s.hours.isOpen ? 'Abierto' : 'Cerrado';

  return (
    <>
      <PageHeader
        title={first ? `Hola, ${first}` : 'Inicio'}
        text={formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            <Link href="/admin/trabajos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-white hover:bg-steel">
              <Plus className="size-4" /> Cargar trabajo
            </Link>
            <Link href="/admin/medios" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 font-bold text-ink ring-1 ring-black/15 hover:ring-black/40">
              <ImagePlus className="size-4" /> Subir fotos
            </Link>
          </>
        }
      />

      {!s.hours.configured && (
        <Link href="/admin/horarios" className="mb-5 flex items-center gap-4 rounded-md bg-lime p-4 text-ink sm:p-5">
          <CalendarClock className="size-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Cargá los horarios del taller</span>
            <span className="block text-sm">Así la web muestra «Abierto ahora» y Google los toma. Hoy dice «Horarios a confirmar».</span>
          </span>
          <ArrowRight className="size-5 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Pedidos nuevos" value={s.totals.quotesNew} href="/admin/pedidos?estado=NEW" tone="cut" sub={s.totals.quotesNew ? 'Para responder' : 'Nada pendiente'} />
        <Tile label="En curso" value={s.totals.inProgress} href="/admin/pedidos?estado=ACTIVE" sub="Presupuestados a listos" />
        <Tile label="Últimos 7 días" value={s.totals.quotes7} href="/admin/pedidos" sub={`${s.totals.quotes30} en 30 días`} />
        <Tile label="Taller" value={hoursText} href="/admin/horarios" sub={s.hours.isOpen && s.hours.closesAt ? `Cierra ${s.hours.closesAt}` : s.hours.next ? `Abre ${s.hours.next.dayLabel.toLowerCase()} ${s.hours.next.opens}` : 'Horarios'} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <QuotesChart daily={s.daily} />
          </Card>
          <Card
            title="Últimos pedidos"
            actions={
              <Link href="/admin/pedidos" className="text-sm font-bold underline-offset-4 hover:underline">
                Ver todos
              </Link>
            }
          >
            {s.recentQuotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">Todavía no llegaron pedidos desde la web.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-black/8">
                {s.recentQuotes.map((q) => (
                  <li key={q.id} className="flex items-center gap-3 px-2 py-3">
                    <Link href={`/admin/pedidos/${q.id}`} className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{q.customerName}</span>
                        <StatusBadge status={q.status} />
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-slate">
                        {q.kind === 'CONTACT' ? 'Consulta' : q.kind === 'ORDER' ? 'Compra en la tienda' : (q.productName ?? 'Presupuesto')}
                        {q.estimate ? `, est. ${money(q.estimate)}` : ''} · {timeAgo(q.createdAt)}
                      </span>
                    </Link>
                    <a href={waLink(waNumberAr(q.phone))} target="_blank" rel="noopener noreferrer" className="grid size-10 shrink-0 place-items-center rounded-md bg-liner text-ink hover:bg-lime" aria-label={`WhatsApp a ${q.customerName}`}>
                      <WhatsAppIcon className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Trabajos más vistos">
            {s.topWorks.every((w) => !w.views) ? (
              <p className="text-sm text-slate">Todavía no hay visitas contadas. Se suman a medida que la gente abre los trabajos en la web.</p>
            ) : (
              <ul className="space-y-3">
                {s.topWorks.map((w) => (
                  <li key={w.id}>
                    <Link href={`/admin/trabajos/${w.id}`} className="flex items-center gap-3">
                      <Img media={w.cover} sizes="48px" ratio="1/1" className="w-12 shrink-0 rounded" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{w.title}</span>
                      <span className="tabular inline-flex items-center gap-1 text-sm text-slate">
                        <Eye className="size-3.5" /> {w.views}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {s.topRequested.length > 0 && (
            <Card title="Lo más pedido">
              <ul className="space-y-2 text-sm">
                {s.topRequested.map((r) => (
                  <li key={r.name} className="flex justify-between gap-3">
                    <span className="truncate">{r.name}</span>
                    <span className="tabular font-bold">{r.n}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Actividad">
            {s.activity.length === 0 ? (
              <p className="text-sm text-slate">Acá vas a ver quién cargó o cambió qué.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {s.activity.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="font-semibold">{a.userName ?? 'Alguien'}</span> {a.action} {a.entity}
                      {a.label ? <span className="text-slate"> «{a.label}»</span> : null}
                      <span className="block text-xs text-slate">{timeAgo(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="En la web">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Trabajos', s.totals.works, '/admin/trabajos'],
                ['Servicios', s.totals.products, '/admin/servicios'],
                ['Rubros', s.totals.categories, '/admin/rubros'],
                ['Historias', s.totals.highlights, '/admin/historias'],
              ].map(([k, v, href]) => (
                <Link key={k as string} href={href as string} className="rounded bg-liner px-3 py-2.5 hover:bg-liner-deep">
                  <span className="block text-slate">{k}</span>
                  <span className="tabular block text-lg font-extrabold">{Number(v).toLocaleString('es-AR')}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
