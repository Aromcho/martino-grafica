import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, count, desc, eq, gte, inArray, lt, ne, or, SQL, sql } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { BusinessInfo, BusinessService } from '../business/business.service';
import { waLink, waNumber } from '../common/utils/phone';
import { fuzzyContains, normCol, normalizeTerm } from '../common/utils/search';
import { nowInStoreTz } from '../common/utils/time';
import { Database, InjectDb } from '../db/db.module';
import { DeliveryMethod, orderItems, quotes, workOrderEvents, workOrderPayments, workOrders, WorkOrderStatus } from '../db/schema';
import { CreateOrderDto, OrderPaymentDto, PaymentMethod, UpdateOrderDto } from './dto/order.dto';

export const ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  TO_CONFIRM: 'A confirmar',
  PENDING: 'Por hacer',
  IN_PROGRESS: 'En producción',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
export const ACTIVE_STATUSES: WorkOrderStatus[] = ['TO_CONFIRM', 'PENDING', 'IN_PROGRESS', 'READY'];
const METHOD_LABEL: Record<PaymentMethod, string> = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  TARJETA: 'tarjeta',
  OTRO: 'otro medio',
};
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

type Order = typeof workOrders.$inferSelect;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export type OrderView = 'active' | 'unpaid' | 'delivered' | 'all';

const money = (n: number) => `$${n.toLocaleString('es-AR')}`;
const pad = (n: number) => `#${String(n).padStart(4, '0')}`;
const dayLabel = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
};
/** Argentina no cambia la hora: el mes del taller arranca a las 00:00 UTC-3 */
const monthStart = (ym: string) => new Date(`${ym}-01T00:00:00-03:00`);
const nextMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/** Lo que falta cobrar (nunca negativo; sin precio = 0) */
const balanceSql = sql<number>`greatest(coalesce(${workOrders.total}, 0) - ${workOrders.paid}, 0)`;
const owesSql = and(ne(workOrders.status, 'CANCELLED'), sql`coalesce(${workOrders.total}, 0) > ${workOrders.paid}`)!;

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Pedidos');
  private readonly siteUrl: string;

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly business: BusinessService,
    config: ConfigService,
  ) {
    this.siteUrl = (config.get<string>('PUBLIC_SITE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  // ---------------------------------------------------------------- helpers
  trackUrl(code: string) {
    return `${this.siteUrl}/seguimiento/${code}`;
  }

  /** Código del link de seguimiento: 8 letras y números sin los que se confunden (0/O, 1/I) */
  private async newCode(db: Database | Tx = this.db) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const code = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
      const [hit] = await db.select({ id: workOrders.id }).from(workOrders).where(eq(workOrders.code, code)).limit(1);
      if (!hit) return code;
    }
  }

  private present<T extends Order>(o: T) {
    const balance = Math.max((o.total ?? 0) - o.paid, 0);
    const payment = o.total == null ? ('NO_PRICE' as const) : balance === 0 ? ('PAID' as const) : o.paid > 0 ? ('PARTIAL' as const) : ('UNPAID' as const);
    return { ...o, balance, payment, ref: pad(o.number), trackUrl: this.trackUrl(o.code) };
  }

  private async find(id: string) {
    const row = await this.db.query.workOrders.findFirst({ where: eq(workOrders.id, id) });
    if (!row) throw new NotFoundException('Pedido no encontrado');
    return row;
  }

  private async recalcPaid(tx: Tx, orderId: string) {
    await tx
      .update(workOrders)
      .set({ paid: sql`(select coalesce(sum(${workOrderPayments.amount}), 0)::int from ${workOrderPayments} where ${workOrderPayments.orderId} = ${orderId})` })
      .where(eq(workOrders.id, orderId));
  }

  // ---------------------------------------------------------------- listados
  /** Tablero: todo lo que está en curso, primero lo que vence antes */
  async board() {
    const rows = await this.db.query.workOrders.findMany({
      where: inArray(workOrders.status, ACTIVE_STATUSES),
      orderBy: [sql`${workOrders.dueDate} asc nulls last`, asc(workOrders.orderedAt)],
      limit: 500,
    });
    return { items: rows.map((r) => this.present(r)), today: nowInStoreTz().ymd };
  }

  async list(params: { view: OrderView; status?: WorkOrderStatus; q?: string; month?: string; page: number; pageSize: number }) {
    const conds: SQL[] = [];
    if (params.status) conds.push(eq(workOrders.status, params.status));
    else if (params.view === 'active') conds.push(inArray(workOrders.status, ACTIVE_STATUSES));
    else if (params.view === 'delivered') conds.push(eq(workOrders.status, 'DELIVERED'));
    if (params.view === 'unpaid') conds.push(owesSql);
    if (params.month) conds.push(gte(workOrders.orderedAt, monthStart(params.month)), lt(workOrders.orderedAt, monthStart(nextMonth(params.month))));
    if (params.q) {
      const digits = params.q.replace(/\D/g, '');
      conds.push(
        or(
          fuzzyContains(workOrders.customerName, params.q),
          fuzzyContains(workOrders.title, params.q),
          fuzzyContains(workOrders.details, params.q),
          fuzzyContains(workOrders.code, params.q),
          ...(digits.length >= 3 ? [sql`regexp_replace(coalesce(${workOrders.phone}, ''), '\\D', '', 'g') LIKE ${'%' + digits + '%'}`] : []),
          ...(digits && digits.length <= 6 ? [eq(workOrders.number, Number(digits))] : []),
        )!,
      );
    }
    const where = conds.length ? and(...conds) : undefined;
    const [items, [agg]] = await Promise.all([
      this.db.query.workOrders.findMany({
        where,
        // Lo que se debe: primero las deudas más viejas. El resto: lo último arriba.
        orderBy: params.view === 'unpaid' ? [asc(workOrders.orderedAt)] : [desc(workOrders.orderedAt), desc(workOrders.number)],
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
      }),
      this.db
        .select({ total: count(), amount: sql<number>`coalesce(sum(${workOrders.total}), 0)::int`, balance: sql<number>`coalesce(sum(${balanceSql}) filter (where ${workOrders.status} <> 'CANCELLED'), 0)::int` })
        .from(workOrders)
        .where(where),
    ]);
    return {
      items: items.map((r) => this.present(r)),
      total: agg.total,
      amount: Number(agg.amount),
      balance: Number(agg.balance),
      page: params.page,
      pageSize: params.pageSize,
      pages: Math.max(1, Math.ceil(agg.total / params.pageSize)),
    };
  }

  /** Números del taller para las tarjetas de arriba y el inicio del panel */
  async summary() {
    const { ymd } = nowInStoreTz();
    const ym = ymd.slice(0, 7);
    const from = monthStart(ym);
    const [byStatus, [debt], [late], [today], [taken], [collected], months] = await Promise.all([
      this.db.select({ status: workOrders.status, n: count() }).from(workOrders).groupBy(workOrders.status),
      this.db.select({ n: count(), amount: sql<number>`coalesce(sum(${balanceSql}), 0)::int` }).from(workOrders).where(owesSql),
      this.db.select({ n: count() }).from(workOrders).where(and(inArray(workOrders.status, ACTIVE_STATUSES), lt(workOrders.dueDate, ymd))),
      this.db.select({ n: count() }).from(workOrders).where(and(inArray(workOrders.status, ACTIVE_STATUSES), eq(workOrders.dueDate, ymd))),
      this.db
        .select({ n: count(), amount: sql<number>`coalesce(sum(${workOrders.total}), 0)::int` })
        .from(workOrders)
        .where(and(gte(workOrders.orderedAt, from), ne(workOrders.status, 'CANCELLED'))),
      this.db.select({ amount: sql<number>`coalesce(sum(${workOrderPayments.amount}), 0)::int` }).from(workOrderPayments).where(gte(workOrderPayments.paidAt, from)),
      this.db.execute<{ month: string; n: number }>(
        sql`SELECT to_char(ordered_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS month, COUNT(*)::int AS n FROM work_orders GROUP BY 1 ORDER BY 1 DESC LIMIT 36`,
      ),
    ]);
    const by = Object.fromEntries(byStatus.map((s) => [s.status, s.n])) as Partial<Record<WorkOrderStatus, number>>;
    return {
      byStatus: by,
      active: ACTIVE_STATUSES.reduce((a, s) => a + (by[s] ?? 0), 0),
      all: byStatus.reduce((a, s) => a + s.n, 0),
      unpaid: { count: debt.n, amount: Number(debt.amount) },
      overdue: late.n,
      dueToday: today.n,
      month: { key: ym, orders: taken.n, amount: Number(taken.amount), collected: Number(collected.amount) },
      months: months.rows.map((m) => ({ month: m.month, count: Number(m.n) })),
    };
  }

  /** Clientes ya cargados, para autocompletar al tomar un pedido */
  async customers(q: string) {
    const term = normalizeTerm(q);
    if (term.length < 2) return [];
    const rows = await this.db
      .select({
        name: sql<string>`(array_agg(${workOrders.customerName} order by ${workOrders.orderedAt} desc))[1]`,
        phone: sql<string | null>`(array_agg(${workOrders.phone} order by ${workOrders.orderedAt} desc) filter (where ${workOrders.phone} is not null))[1]`,
        orders: count(),
        last: sql<string>`max(${workOrders.orderedAt})`,
      })
      .from(workOrders)
      .where(fuzzyContains(workOrders.customerName, q))
      .groupBy(normCol(workOrders.customerName))
      .orderBy(sql`max(${workOrders.orderedAt}) desc`)
      .limit(6);
    return rows;
  }

  // ---------------------------------------------------------------- detalle
  async detail(id: string) {
    const row = await this.db.query.workOrders.findFirst({
      where: eq(workOrders.id, id),
      with: {
        payments: { orderBy: [desc(workOrderPayments.paidAt), desc(workOrderPayments.createdAt)], with: { user: { columns: { name: true } } } },
        events: { orderBy: [desc(workOrderEvents.createdAt)], with: { user: { columns: { name: true } } } },
        author: { columns: { name: true } },
        quote: { columns: { id: true, code: true, kind: true } },
      },
    });
    if (!row) throw new NotFoundException('Pedido no encontrado');
    const [related, info] = await Promise.all([
      this.db.query.workOrders.findMany({
        where: and(sql`${normCol(workOrders.customerName)} = ${normalizeTerm(row.customerName)}`, ne(workOrders.id, id)),
        orderBy: [desc(workOrders.orderedAt)],
        limit: 8,
        columns: { id: true, number: true, title: true, status: true, total: true, paid: true, orderedAt: true },
      }),
      this.business.getSetting<BusinessInfo | null>('business', null),
    ]);
    const order = this.present(row);
    return {
      ...order,
      activityLabel: `${order.ref} · ${row.customerName}`,
      customerWhatsapp: row.phone ? waNumber(row.phone) : null,
      message: this.customerMessage(order, info),
      related: related.map((r) => ({ ...r, ref: pad(r.number), balance: Math.max((r.total ?? 0) - r.paid, 0) })),
    };
  }

  /** Mensaje sugerido para mandarle al cliente por WhatsApp, según en qué está el pedido */
  customerMessage(o: Order & { balance: number; ref: string; trackUrl: string }, info: BusinessInfo | null) {
    const first = o.customerName.trim().split(/\s+/)[0];
    const what = o.title ? ` (${o.title})` : '';
    const follow = `Podés ver cómo va cuando quieras acá:\n${o.trackUrl}`;
    const owes = o.balance > 0 ? ` Resta abonar ${money(o.balance)}.` : '';
    const where = info?.address ? ` en ${info.address}` : ' por el taller';
    switch (o.status) {
      case 'TO_CONFIRM':
        return `¡Hola ${first}! Te paso tu pedido ${o.ref} de Martino Gráfica${what}${o.total ? `: ${money(o.total)}` : ''}. Avisanos si lo confirmás y arrancamos. ${follow}`;
      case 'IN_PROGRESS':
        return `¡Hola ${first}! Ya estamos trabajando en tu pedido ${o.ref}${what}. ${follow}`;
      case 'READY':
        return o.delivery === 'INSTALL'
          ? `¡Hola ${first}! Tu pedido ${o.ref}${what} ya está listo para colocar. ¿Cuándo te queda bien que vayamos?${owes}\n${o.trackUrl}`
          : o.delivery === 'SHIPPING'
            ? `¡Hola ${first}! Tu pedido ${o.ref}${what} ya está listo. Coordinemos el envío.${owes}\n${o.trackUrl}`
            : `¡Hola ${first}! Tu pedido ${o.ref}${what} ya está listo. Podés pasar a retirarlo${where}.${owes}\n${o.trackUrl}`;
      case 'DELIVERED':
        return o.balance > 0
          ? `¡Hola ${first}! Te escribimos de Martino Gráfica por tu pedido ${o.ref}${what}: quedó un saldo de ${money(o.balance)}. ¿Cómo preferís abonarlo? ¡Gracias!`
          : `¡Hola ${first}! Gracias por elegir Martino Gráfica. Cualquier cosa que necesites de tu pedido ${o.ref}, escribinos.`;
      case 'CANCELLED':
        return `¡Hola ${first}! Te escribimos de Martino Gráfica por tu pedido ${o.ref}${what}.`;
      default: {
        const due = o.dueDate ? ` Lo tenemos para el ${dayLabel(o.dueDate)}.` : '';
        const pay = o.total ? ` Total ${money(o.total)}${o.paid > 0 ? `, seña ${money(o.paid)}` : ''}${o.balance > 0 && o.paid > 0 ? `, resta ${money(o.balance)}` : ''}.` : '';
        return `¡Hola ${first}! Ya anotamos tu pedido ${o.ref} en Martino Gráfica${what}.${due}${pay} ${follow}`;
      }
    }
  }

  // ---------------------------------------------------------------- altas y cambios
  async create(dto: CreateOrderDto, userId?: string, extra: { source?: string; quoteId?: string | null } = {}) {
    const deposit = dto.deposit ?? 0;
    if (dto.total != null && deposit > dto.total) throw new BadRequestException('La seña no puede ser mayor que el total');
    const status = dto.status ?? 'PENDING';
    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(workOrders)
        .values({
          code: await this.newCode(tx),
          status,
          customerName: dto.customerName,
          phone: dto.phone ?? null,
          title: dto.title,
          details: dto.details ?? null,
          delivery: dto.delivery ?? 'PICKUP',
          dueDate: dto.dueDate ?? null,
          dueNote: dto.dueDate ? null : (dto.dueNote ?? null),
          total: dto.total ?? null,
          paid: deposit,
          notes: dto.notes ?? null,
          source: extra.source ?? 'mostrador',
          quoteId: extra.quoteId ?? null,
          createdBy: userId ?? null,
        })
        .returning({ id: workOrders.id });
      const events: (typeof workOrderEvents.$inferInsert)[] = [
        { orderId: row.id, type: 'created', toStatus: status, userId, note: extra.source === 'web' ? 'Pedido creado desde una consulta de la web' : 'Pedido tomado en el mostrador' },
      ];
      if (deposit > 0) {
        const method = dto.depositMethod ?? 'EFECTIVO';
        await tx.insert(workOrderPayments).values({ orderId: row.id, amount: deposit, method, userId, note: dto.total != null && deposit >= dto.total ? 'Pago total' : 'Seña' });
        events.push({ orderId: row.id, type: 'payment', userId, note: `${dto.total != null && deposit >= dto.total ? 'Pagó el total' : 'Dejó una seña de'} ${money(deposit)} (${METHOD_LABEL[method]})` });
      }
      await tx.insert(workOrderEvents).values(events);
      return row.id;
    });
    return this.detail(id);
  }

  async update(id: string, dto: UpdateOrderDto, userId?: string) {
    const current = await this.find(id);
    const patch: Partial<typeof workOrders.$inferInsert> = {};
    const events: (typeof workOrderEvents.$inferInsert)[] = [];

    if (dto.status && dto.status !== current.status) {
      patch.status = dto.status;
      patch.deliveredAt = dto.status === 'DELIVERED' ? new Date() : null;
      events.push({ orderId: id, type: 'status', fromStatus: current.status, toStatus: dto.status, userId, note: `${ORDER_STATUS_LABEL[current.status]} → ${ORDER_STATUS_LABEL[dto.status]}` });
    }
    if (dto.total !== undefined && dto.total !== current.total) {
      if (dto.total != null && dto.total < current.paid) throw new BadRequestException(`Ya hay ${money(current.paid)} cobrados: el total no puede ser menor`);
      patch.total = dto.total;
      events.push({ orderId: id, type: 'edit', userId, note: dto.total == null ? 'Se quitó el precio' : current.total == null ? `Precio: ${money(dto.total)}` : `Precio: ${money(current.total)} → ${money(dto.total)}` });
    }
    if (dto.dueDate !== undefined && dto.dueDate !== current.dueDate) {
      patch.dueDate = dto.dueDate;
      if (dto.dueDate) patch.dueNote = null;
      events.push({ orderId: id, type: 'edit', userId, note: dto.dueDate ? `Entrega: ${dayLabel(dto.dueDate)}` : 'Se quitó la fecha de entrega' });
    }
    if (dto.dueNote !== undefined && !patch.dueDate && dto.dueNote !== current.dueNote) patch.dueNote = dto.dueNote;

    const plain: (keyof UpdateOrderDto & keyof Order)[] = ['customerName', 'phone', 'title', 'details', 'delivery', 'notes'];
    let edited = false;
    for (const k of plain) {
      if (dto[k] !== undefined && dto[k] !== current[k]) {
        (patch as Record<string, unknown>)[k] = dto[k];
        if (k !== 'notes') edited = true;
      }
    }
    if (edited) events.push({ orderId: id, type: 'edit', userId, note: 'Se editaron los datos del pedido' });

    if (Object.keys(patch).length) await this.db.update(workOrders).set(patch).where(eq(workOrders.id, id));
    if (events.length) await this.db.insert(workOrderEvents).values(events);
    return this.detail(id);
  }

  async addPayment(id: string, dto: OrderPaymentDto, userId?: string) {
    const o = await this.find(id);
    if (o.total == null) throw new BadRequestException('Cargá primero el total del pedido');
    const balance = Math.max(o.total - o.paid, 0);
    if (dto.amount > balance) throw new BadRequestException(balance ? `El saldo es ${money(balance)}: el pago no puede ser mayor` : 'Este pedido ya está pago');
    const method = dto.method ?? 'EFECTIVO';
    await this.db.transaction(async (tx) => {
      await tx.insert(workOrderPayments).values({ orderId: id, amount: dto.amount, method, note: dto.note ?? null, userId });
      await this.recalcPaid(tx, id);
      await tx.insert(workOrderEvents).values({
        orderId: id,
        type: 'payment',
        userId,
        note: `Cobro de ${money(dto.amount)} (${METHOD_LABEL[method]})${dto.amount === balance ? ' · queda pago' : ` · resta ${money(balance - dto.amount)}`}`,
      });
    });
    return this.detail(id);
  }

  async removePayment(id: string, paymentId: string, userId?: string) {
    const p = await this.db.query.workOrderPayments.findFirst({ where: and(eq(workOrderPayments.id, paymentId), eq(workOrderPayments.orderId, id)) });
    if (!p) throw new NotFoundException('Pago no encontrado');
    await this.db.transaction(async (tx) => {
      await tx.delete(workOrderPayments).where(eq(workOrderPayments.id, paymentId));
      await this.recalcPaid(tx, id);
      await tx.insert(workOrderEvents).values({ orderId: id, type: 'payment', userId, note: `Se anuló un cobro de ${money(p.amount)}` });
    });
    return this.detail(id);
  }

  async addNote(id: string, note: string, userId?: string) {
    await this.find(id);
    await this.db.insert(workOrderEvents).values({ orderId: id, type: 'note', note, userId });
    return this.detail(id);
  }

  async logWhatsapp(id: string, userId?: string) {
    const o = await this.find(id);
    await this.db.insert(workOrderEvents).values({ orderId: id, type: 'whatsapp', note: 'Se le mandó el seguimiento por WhatsApp', userId });
    return { ok: true, id, activityLabel: `${pad(o.number)} · ${o.customerName}` };
  }

  async remove(id: string) {
    const o = await this.find(id);
    await this.db.delete(workOrders).where(eq(workOrders.id, id));
    return { id, activityLabel: `${pad(o.number)} · ${o.customerName}` };
  }

  /** Pasa una consulta, presupuesto o compra de la web a pedido del taller (una sola vez) */
  async fromQuote(quoteId: string, userId?: string) {
    const existing = await this.db.query.workOrders.findFirst({ where: eq(workOrders.quoteId, quoteId), columns: { id: true } });
    if (existing) return this.detail(existing.id);
    const q = await this.db.query.quotes.findFirst({ where: eq(quotes.id, quoteId), with: { items: { orderBy: [asc(orderItems.sortOrder)] } } });
    if (!q) throw new NotFoundException('Consulta no encontrada');
    const cm = (n: string) => String(Number(n)).replace('.', ',');
    const lines = [
      ...q.items.map((it) => `${it.quantity} × ${it.name}`),
      q.width && q.height ? `Medida: ${cm(q.width)} × ${cm(q.height)} cm` : null,
      q.kind === 'QUOTE' && q.quantity > 1 ? `Cantidad: ${q.quantity}` : null,
      q.size ? `Talle o tamaño: ${q.size}` : null,
      q.material ? `Material: ${q.material}` : null,
      q.finish ? `Terminación: ${q.finish}` : null,
      q.kind === 'QUOTE' ? (q.needsDesign ? 'Hay que hacerle el diseño' : 'Trae el diseño') : null,
      q.message,
    ].filter(Boolean);
    return this.create(
      {
        customerName: q.customerName.slice(0, 80),
        phone: /^[\d\s()+-]{6,24}$/.test(q.phone) ? q.phone : null,
        title: (q.productName ?? (q.kind === 'ORDER' ? 'Compra en la tienda web' : 'Pedido desde la web')).slice(0, 160),
        details: lines.join('\n').slice(0, 4000) || null,
        delivery: q.delivery as DeliveryMethod,
        dueDate: q.deadline,
        total: q.quotedPrice ?? q.estimate ?? null,
        notes: `Viene de la web (${q.code})`,
      },
      userId,
      { source: 'web', quoteId },
    );
  }

  // ---------------------------------------------------------------- seguimiento público
  /** Lo que ve el cliente con su link: nunca teléfono, notas internas ni quién lo cargó */
  async track(code: string) {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(clean)) throw new NotFoundException('No encontramos ese pedido');
    const o = await this.db.query.workOrders.findFirst({
      where: eq(workOrders.code, clean),
      with: { events: { where: inArray(workOrderEvents.type, ['created', 'status']), orderBy: [asc(workOrderEvents.createdAt)], columns: { toStatus: true, createdAt: true } } },
    });
    if (!o) throw new NotFoundException('No encontramos ese pedido');
    // Cuándo llegó a cada etapa (la última vez, por si volvió para atrás)
    const reached: Partial<Record<WorkOrderStatus, Date>> = {};
    for (const ev of o.events) if (ev.toStatus) reached[ev.toStatus] = ev.createdAt;
    const imported = o.source === 'excel';
    return {
      ref: pad(o.number),
      code: o.code,
      firstName: o.customerName.trim().split(/\s+/)[0],
      title: o.title,
      details: imported ? null : o.details,
      status: o.status,
      delivery: o.delivery,
      dueDate: o.dueDate,
      dueNote: imported ? null : o.dueNote,
      // Los importados de la planilla sólo saben el mes: no se muestra una fecha inventada
      orderedAt: imported ? null : o.orderedAt,
      deliveredAt: imported ? null : o.deliveredAt,
      total: o.total,
      paid: o.paid,
      balance: Math.max((o.total ?? 0) - o.paid, 0),
      reached: imported ? {} : reached,
      updatedAt: o.updatedAt,
    };
  }

  // ---------------------------------------------------------------- historial descartado
  /**
   * El historial importado de la planilla se descartó a pedido del cliente: al arrancar se borran los
   * pedidos que vinieron del Excel (pagos y movimientos se van en cascada). Si no queda ningún pedido,
   * la numeración vuelve a empezar en #0001.
   */
  async onApplicationBootstrap() {
    try {
      const removed = await this.db.delete(workOrders).where(eq(workOrders.source, 'excel')).returning({ id: workOrders.id });
      if (!removed.length) return;
      const [{ n }] = await this.db.select({ n: count() }).from(workOrders);
      if (n === 0) await this.db.execute(sql`alter table work_orders alter column number restart with 1`);
      this.logger.log(`Se borraron ${removed.length} pedidos importados del Excel`);
    } catch (err) {
      this.logger.error(`No se pudieron borrar los pedidos importados: ${(err as Error).message}`);
    }
  }
}
