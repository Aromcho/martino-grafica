import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { and, asc, eq, gte, inArray, isNotNull, lt, notInArray, sql } from 'drizzle-orm';
import { Database, InjectDb } from '../db/db.module';
import { quotes, QuoteStatus, workOrderPayments, workOrders, WorkOrderStatus, works } from '../db/schema';
import { InternalGuard } from './internal.guard';
import { UpcomingItem, baDay, bump, emptySeries, parseLimit, parseRange, sortUpcoming, today, totalsOf } from './internal.util';

/**
 * Módulo /internal de Martino Gráfica (panel central). Solo lectura.
 * Contrato: GET /api/internal/health · /api/internal/metrics?desde=&hasta= · /api/internal/upcoming?limite=
 * Contrato completo y cómo sumar un proyecto: README del repo panel-dios.
 *
 * Hacia el panel salen cantidades, montos, estados y números de pedido: no el nombre ni el
 * teléfono del cliente.
 */
const SERVICE = 'martino';
const { version } = require('../../package.json') as { version: string };

/** Contadores de la serie diaria. «cobros» es la suma en pesos de los pagos registrados en el taller. */
const COUNTERS = ['consultas', 'pedidos', 'pedidosTaller', 'pedidosEntregados', 'cobros', 'trabajos'] as const;
/** Qué contadores propios alimentan cada contador común del panel */
const COMMON = { publicaciones: ['trabajos'], consultas: ['consultas'], ventas: ['pedidos', 'pedidosTaller'], visitas: [] };
const OPEN_ORDERS: WorkOrderStatus[] = ['TO_CONFIRM', 'PENDING', 'IN_PROGRESS', 'READY'];
const CLOSED_QUOTES: QuoteStatus[] = ['DELIVERED', 'CANCELLED'];
const ORDER_LABEL: Record<string, string> = { TO_CONFIRM: 'a confirmar', PENDING: 'pendiente', IN_PROGRESS: 'en producción', READY: 'listo para entregar' };
const QUOTE_LABEL: Record<string, string> = { NEW: 'nuevo', CONTACTED: 'contactado', QUOTED: 'presupuestado', APPROVED: 'aprobado', IN_PRODUCTION: 'en producción', READY: 'listo' };

@Injectable()
class InternalService {
  constructor(@InjectDb() private readonly db: Database) {}

  async health() {
    let db: 'up' | 'down' = 'up';
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      db = 'down';
    }
    return { ok: db === 'up', service: SERVICE, version, uptime: Math.round(process.uptime()), db, now: new Date().toISOString() };
  }

  async metrics(query: Record<string, unknown>) {
    const range = parseRange(query);
    const [web, taller, entregados, pagos, publicados, porCobrar] = await Promise.all([
      this.db
        .select({ createdAt: quotes.createdAt, kind: quotes.kind, status: quotes.status })
        .from(quotes)
        .where(and(gte(quotes.createdAt, range.from), lt(quotes.createdAt, range.to))),
      this.db
        .select({ orderedAt: workOrders.orderedAt, status: workOrders.status })
        .from(workOrders)
        .where(and(gte(workOrders.orderedAt, range.from), lt(workOrders.orderedAt, range.to))),
      this.db
        .select({ deliveredAt: workOrders.deliveredAt })
        .from(workOrders)
        .where(and(gte(workOrders.deliveredAt, range.from), lt(workOrders.deliveredAt, range.to))),
      this.db
        .select({ paidAt: workOrderPayments.paidAt, amount: workOrderPayments.amount })
        .from(workOrderPayments)
        .where(and(gte(workOrderPayments.paidAt, range.from), lt(workOrderPayments.paidAt, range.to))),
      this.db
        .select({ createdAt: works.createdAt })
        .from(works)
        .where(and(eq(works.active, true), gte(works.createdAt, range.from), lt(works.createdAt, range.to))),
      // Saldo de los pedidos del taller que siguen abiertos (foto de hoy, no del rango)
      this.db
        .select({ n: sql<number>`coalesce(sum(greatest(${workOrders.total} - ${workOrders.paid}, 0)), 0)::int` })
        .from(workOrders)
        .where(and(inArray(workOrders.status, OPEN_ORDERS), isNotNull(workOrders.total))),
    ]);

    const series = emptySeries(range, COUNTERS);
    const consultasPorEstado: Record<string, number> = {};
    for (const q of web) {
      // kind ORDER = compra hecha en la tienda de la web; QUOTE y CONTACT = pedidos de presupuesto y consultas
      if (q.kind === 'ORDER') {
        if (q.status !== 'CANCELLED') bump(series, baDay(q.createdAt), 'pedidos');
        continue;
      }
      bump(series, baDay(q.createdAt), 'consultas');
      consultasPorEstado[q.status] = (consultasPorEstado[q.status] ?? 0) + 1;
    }
    const pedidosTallerPorEstado: Record<string, number> = {};
    for (const o of taller) {
      pedidosTallerPorEstado[o.status] = (pedidosTallerPorEstado[o.status] ?? 0) + 1;
      if (o.status !== 'CANCELLED') bump(series, baDay(o.orderedAt), 'pedidosTaller');
    }
    entregados.forEach((o) => o.deliveredAt && bump(series, baDay(o.deliveredAt), 'pedidosEntregados'));
    pagos.forEach((p) => bump(series, baDay(p.paidAt), 'cobros', p.amount));
    publicados.forEach((w) => bump(series, baDay(w.createdAt), 'trabajos'));

    return {
      service: SERVICE,
      desde: range.desde,
      hasta: range.hasta,
      totals: { ...totalsOf(series, COUNTERS), consultasPorEstado, pedidosTallerPorEstado, porCobrar: porCobrar[0]?.n ?? 0 },
      common: COMMON,
      series: [...series.values()],
      byProperty: [],
    };
  }

  async upcoming(query: Record<string, unknown>) {
    const limite = parseLimit(query);
    const hoy = today();
    const [taller, web, nuevas] = await Promise.all([
      this.db
        .select({ number: workOrders.number, title: workOrders.title, status: workOrders.status, dueDate: workOrders.dueDate, dueNote: workOrders.dueNote, orderedAt: workOrders.orderedAt })
        .from(workOrders)
        .where(inArray(workOrders.status, OPEN_ORDERS))
        .orderBy(asc(workOrders.dueDate), asc(workOrders.orderedAt))
        .limit(limite * 2),
      // Consultas y compras de la web con fecha pedida por el cliente
      this.db
        .select({ code: quotes.code, kind: quotes.kind, status: quotes.status, productName: quotes.productName, deadline: quotes.deadline })
        .from(quotes)
        .where(and(isNotNull(quotes.deadline), gte(quotes.deadline, hoy), notInArray(quotes.status, CLOSED_QUOTES)))
        .orderBy(asc(quotes.deadline))
        .limit(limite),
      this.db
        .select({ n: sql<number>`count(*)::int`, first: sql<Date | null>`min(${quotes.createdAt})` })
        .from(quotes)
        .where(eq(quotes.status, 'NEW')),
    ]);

    const items: UpcomingItem[] = [
      ...taller.map((o) => {
        // Sin fecha de entrega, o con la fecha ya pasada: es un pendiente
        const overdue = !o.dueDate || o.dueDate < hoy;
        const label = ORDER_LABEL[o.status] ?? o.status;
        return {
          kind: 'pedido_taller',
          title: `#${String(o.number).padStart(4, '0')}${o.title ? ` ${o.title}` : ''}`,
          date: o.dueDate ?? baDay(o.orderedAt),
          pending: overdue,
          who: '',
          status: !o.dueDate ? `${label}, entrega: ${o.dueNote || 'sin fecha'}` : o.dueDate < hoy ? `${label}, atrasado` : label,
          propertyId: null,
          ref: String(o.number),
        };
      }),
      ...web.map((q) => ({
        kind: q.kind === 'ORDER' ? 'pedido' : 'consulta',
        title: `${q.code}${q.productName ? ` ${q.productName}` : ''}`,
        date: q.deadline!,
        pending: false,
        who: '',
        status: QUOTE_LABEL[q.status] ?? q.status,
        propertyId: null,
        ref: q.code,
      })),
    ];
    const sinContactar = nuevas[0]?.n ?? 0;
    if (sinContactar) {
      items.push({
        kind: 'consulta',
        title: `${sinContactar} ${sinContactar === 1 ? 'consulta de la web sin contactar' : 'consultas de la web sin contactar'}`,
        date: baDay(nuevas[0].first ? new Date(nuevas[0].first) : new Date()),
        pending: true,
        who: '',
        status: '',
        propertyId: null,
        ref: 'consultas-nuevas',
      });
    }

    const sorted = sortUpcoming(items);
    return {
      service: SERVICE,
      generatedAt: new Date().toISOString(),
      items: [...sorted.filter((i) => !i.pending).slice(0, limite), ...sorted.filter((i) => i.pending).slice(0, limite)],
    };
  }
}

@ApiExcludeController()
@SkipThrottle()
@Controller('internal')
@UseGuards(InternalGuard)
class InternalController {
  constructor(private readonly internal: InternalService) {}

  @Get('health')
  health() {
    return this.internal.health();
  }

  @Get('metrics')
  metrics(@Query() query: Record<string, unknown>) {
    return this.internal.metrics(query);
  }

  @Get('upcoming')
  upcoming(@Query() query: Record<string, unknown>) {
    return this.internal.upcoming(query);
  }
}

@Module({ controllers: [InternalController], providers: [InternalService, InternalGuard] })
export class InternalModule {}
