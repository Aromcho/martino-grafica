import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, or, SQL, inArray } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { extname, join, posix, resolve } from 'path';
import { fuzzyContains } from '../common/utils/search';
import { waLink, waNumber } from '../common/utils/phone';
import { nowInStoreTz } from '../common/utils/time';
import { BusinessInfo, BusinessService } from '../business/business.service';
import { Database, InjectDb } from '../db/db.module';
import { DeliveryMethod, products, quoteEvents, quoteFiles, quotes, QuoteKind, QuoteStatus } from '../db/schema';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUOTED: 'Presupuestado',
  APPROVED: 'Aprobado',
  IN_PRODUCTION: 'En producción',
  READY: 'Listo para entregar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  PICKUP: 'Retiro en el taller',
  INSTALL: 'Con colocación',
  SHIPPING: 'Envío',
};
export const ALLOWED_EXT = ['.pdf', '.ai', '.eps', '.svg', '.cdr', '.psd', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.tif', '.tiff', '.zip', '.rar', '.dxf', '.plt'];

const money = (n: number) => `$${n.toLocaleString('es-AR')}`;
const cm = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

@Injectable()
export class QuotesService {
  readonly privateDir: string;

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly business: BusinessService,
    config: ConfigService,
  ) {
    this.privateDir = resolve(config.get<string>('PRIVATE_DIR') ?? './private');
  }

  private async newCode() {
    const { day, month } = nowInStoreTz();
    for (let i = 0; i < 8; i++) {
      const code = `MG-${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}-${randomInt(1000, 9999)}`;
      if (!(await this.db.query.quotes.findFirst({ where: eq(quotes.code, code), columns: { id: true } }))) return code;
    }
    return `MG-${Date.now().toString(36).toUpperCase()}`;
  }

  /** Precio estimado según la escala publicada (sólo productos por cantidad) */
  estimate(product: { priceTiers: { minQty: number; price: number }[]; priceFrom: number | null; quoteMode: string } | null, qty: number) {
    if (!product || product.quoteMode !== 'UNITS') return null;
    const tiers = [...(product.priceTiers ?? [])].sort((a, b) => a.minQty - b.minQty);
    const tier = tiers.filter((t) => qty >= t.minQty).pop();
    const unit = tier?.price ?? product.priceFrom;
    return unit ? { unit, total: unit * qty } : null;
  }

  async create(dto: CreateQuoteDto, files: Express.Multer.File[] = [], maxMb = 25) {
    if (dto.website) throw new BadRequestException('No pudimos enviar el pedido');
    for (const f of files) {
      const ext = extname(f.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) throw new BadRequestException(`El archivo "${f.originalname}" no es un formato de diseño aceptado`);
      if (f.size > maxMb * 1024 * 1024) throw new BadRequestException(`"${f.originalname}" supera los ${maxMb} MB`);
    }

    const product = dto.productId
      ? await this.db.query.products.findFirst({ where: eq(products.id, dto.productId) })
      : dto.productSlug
        ? await this.db.query.products.findFirst({ where: eq(products.slug, dto.productSlug) })
        : undefined;
    const kind: QuoteKind = dto.kind ?? 'QUOTE';
    const quantity = dto.quantity ?? 1;
    const est = this.estimate(product ?? null, quantity);
    const code = await this.newCode();

    const [row] = await this.db
      .insert(quotes)
      .values({
        code,
        kind,
        customerName: dto.customerName,
        phone: dto.phone,
        email: dto.email ?? null,
        city: dto.city ?? null,
        productId: product?.id ?? null,
        productName: product?.name ?? dto.productName ?? null,
        categoryId: product?.categoryId ?? null,
        width: dto.width != null ? String(dto.width) : null,
        height: dto.height != null ? String(dto.height) : null,
        quantity,
        material: dto.material ?? null,
        finish: dto.finish ?? null,
        size: dto.size ?? null,
        needsDesign: dto.needsDesign ?? false,
        delivery: dto.delivery ?? 'PICKUP',
        deadline: dto.deadline?.slice(0, 10) ?? null,
        message: dto.message ?? null,
        estimate: est?.total ?? null,
      })
      .returning();

    if (files.length) {
      const now = new Date();
      const folder = posix.join('quotes', String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), code);
      const dir = join(this.privateDir, ...folder.split('/'));
      await fs.mkdir(dir, { recursive: true });
      const rows = [];
      for (const [i, f] of files.entries()) {
        const ext = extname(f.originalname).toLowerCase();
        const base = f.originalname.slice(0, -ext.length || undefined).normalize('NFD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'archivo';
        const name = `${i + 1}-${base}${ext}`;
        await fs.writeFile(join(dir, name), f.buffer);
        rows.push({ quoteId: row.id, path: posix.join(folder, name), originalName: f.originalname.slice(0, 200), mime: f.mimetype, sizeBytes: f.size });
      }
      await this.db.insert(quoteFiles).values(rows);
    }
    await this.db.insert(quoteEvents).values({ quoteId: row.id, type: 'created', toStatus: 'NEW', note: `Pedido recibido desde la web${files.length ? ` con ${files.length} archivo(s)` : ''}` });

    const info = await this.business.getSetting<BusinessInfo | null>('business', null);
    const text = this.customerMessage(row, files.length, est);
    return {
      code,
      estimate: est,
      whatsappUrl: info?.whatsapp ? waLink(waNumber(info.whatsapp), text) : null,
      message: text,
    };
  }

  /** Mensaje que el cliente manda por WhatsApp al taller */
  customerMessage(q: typeof quotes.$inferSelect, fileCount: number, est: { unit: number; total: number } | null) {
    const lines = [q.kind === 'CONTACT' ? `Hola Martino Gráfica 👋 Les escribo desde la web (consulta ${q.code}).` : `Hola Martino Gráfica 👋 Les pido presupuesto: ${q.code}`];
    if (q.productName) lines.push(`• Trabajo: ${q.productName}`);
    if (q.width && q.height) lines.push(`• Medida: ${cm(Number(q.width))} × ${cm(Number(q.height))} cm`);
    if (q.size) lines.push(`• Talle/tamaño: ${q.size}`);
    if (q.kind === 'QUOTE') lines.push(`• Cantidad: ${q.quantity}`);
    if (q.material) lines.push(`• Material: ${q.material}`);
    if (q.finish) lines.push(`• Terminación: ${q.finish}`);
    if (q.kind === 'QUOTE') lines.push(`• Diseño: ${q.needsDesign ? 'necesito que me lo diseñen' : fileCount ? `tengo el diseño (adjunté ${fileCount} archivo${fileCount > 1 ? 's' : ''} en la web)` : 'tengo el diseño'}`);
    if (q.kind === 'QUOTE') lines.push(`• Entrega: ${DELIVERY_LABEL[q.delivery]}`);
    if (q.deadline) lines.push(`• Lo necesito para: ${q.deadline.split('-').reverse().join('/')}`);
    if (est) lines.push(`• Precio de lista publicado: ${money(est.unit)} c/u → ${money(est.total)} (a confirmar)`);
    if (q.message) lines.push('', q.message);
    lines.push('', `${q.customerName}${q.city ? ` · ${q.city}` : ''}`);
    return lines.join('\n');
  }

  // ---------------------------------------------------------------- admin
  async list(params: { status?: QuoteStatus | 'ACTIVE'; kind?: QuoteKind; q?: string; page: number; pageSize: number }) {
    const conds: SQL[] = [];
    if (params.status === 'ACTIVE') conds.push(inArray(quotes.status, ['QUOTED', 'APPROVED', 'IN_PRODUCTION', 'READY']));
    else if (params.status) conds.push(eq(quotes.status, params.status));
    if (params.kind) conds.push(eq(quotes.kind, params.kind));
    if (params.q)
      conds.push(
        or(
          fuzzyContains(quotes.customerName, params.q),
          fuzzyContains(quotes.code, params.q),
          fuzzyContains(quotes.phone, params.q),
          fuzzyContains(quotes.productName, params.q),
          fuzzyContains(quotes.message, params.q),
        )!,
      );
    const where = conds.length ? and(...conds) : undefined;
    const [items, [{ total }], byStatus] = await Promise.all([
      this.db.query.quotes.findMany({
        where,
        orderBy: [desc(quotes.createdAt)],
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        with: { files: { columns: { id: true } } },
      }),
      this.db.select({ total: count() }).from(quotes).where(where),
      this.db.select({ status: quotes.status, n: count() }).from(quotes).groupBy(quotes.status),
    ]);
    return {
      items: items.map(({ files, ...q }) => ({ ...q, fileCount: files.length })),
      total,
      page: params.page,
      pageSize: params.pageSize,
      pages: Math.max(1, Math.ceil(total / params.pageSize)),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s.n])),
    };
  }

  async detail(id: string) {
    const row = await this.db.query.quotes.findFirst({
      where: eq(quotes.id, id),
      with: {
        files: true,
        events: { orderBy: [desc(quoteEvents.createdAt)], with: { user: { columns: { name: true } } } },
        product: { columns: { id: true, slug: true, name: true } },
        category: { columns: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Pedido no encontrado');
    return { ...row, whatsappUrl: waLink(waNumber(row.phone), this.replyMessage(row)), customerWhatsapp: waNumber(row.phone) };
  }

  /** Mensaje sugerido para responderle al cliente según el estado */
  replyMessage(q: typeof quotes.$inferSelect) {
    const first = q.customerName.split(' ')[0];
    const ref = `(pedido ${q.code})`;
    const what = q.productName ? ` por ${q.productName.toLowerCase()}` : '';
    switch (q.status) {
      case 'QUOTED':
        return `¡Hola ${first}! Te paso el presupuesto${what} ${ref}${q.quotedPrice ? `: ${money(q.quotedPrice)}` : ''}. Cualquier duda, avisame. Martino Gráfica`;
      case 'APPROVED':
      case 'IN_PRODUCTION':
        return `¡Hola ${first}! Ya estamos trabajando en tu pedido ${ref}. Te aviso apenas esté listo. Martino Gráfica`;
      case 'READY':
        return `¡Hola ${first}! Tu pedido ${ref} ya está listo. ¿Cuándo pasás a retirarlo? Martino Gráfica`;
      default:
        return `¡Hola ${first}! Te escribo de Martino Gráfica por tu consulta${what} ${ref}.`;
    }
  }

  async update(id: string, dto: UpdateQuoteDto, userId?: string) {
    const current = await this.db.query.quotes.findFirst({ where: eq(quotes.id, id) });
    if (!current) throw new NotFoundException('Pedido no encontrado');
    const patch: Partial<typeof quotes.$inferInsert> = {};
    const events: (typeof quoteEvents.$inferInsert)[] = [];
    if (dto.status && dto.status !== current.status) {
      patch.status = dto.status;
      if (dto.status === 'CONTACTED' && !current.contactedAt) patch.contactedAt = new Date();
      events.push({ quoteId: id, type: 'status', fromStatus: current.status, toStatus: dto.status, userId, note: `${STATUS_LABEL[current.status]} → ${STATUS_LABEL[dto.status]}` });
    }
    if (dto.adminNotes !== undefined) patch.adminNotes = dto.adminNotes;
    if (dto.quotedPrice !== undefined && dto.quotedPrice !== current.quotedPrice) {
      patch.quotedPrice = dto.quotedPrice;
      events.push({ quoteId: id, type: 'price', userId, note: dto.quotedPrice ? `Precio presupuestado: ${money(dto.quotedPrice)}` : 'Se quitó el precio' });
    }
    if (Object.keys(patch).length) await this.db.update(quotes).set(patch).where(eq(quotes.id, id));
    if (events.length) await this.db.insert(quoteEvents).values(events);
    const d = await this.detail(id);
    return { ...d, label: `${d.code} · ${d.customerName}` };
  }

  async addNote(id: string, note: string, userId?: string) {
    await this.detail(id);
    await this.db.insert(quoteEvents).values({ quoteId: id, type: 'note', note, userId });
    return this.detail(id);
  }

  async logWhatsapp(id: string, userId?: string) {
    const q = await this.detail(id);
    await this.db.insert(quoteEvents).values({ quoteId: id, type: 'whatsapp', note: 'Se respondió por WhatsApp', userId });
    if (q.status === 'NEW') await this.update(id, { status: 'CONTACTED' }, userId);
    return { ok: true, whatsappUrl: q.whatsappUrl, code: q.code };
  }

  async file(quoteId: string, fileId: string) {
    const f = await this.db.query.quoteFiles.findFirst({ where: and(eq(quoteFiles.id, fileId), eq(quoteFiles.quoteId, quoteId)) });
    if (!f) throw new NotFoundException('Archivo no encontrado');
    const full = join(this.privateDir, ...f.path.split('/'));
    if (!full.startsWith(this.privateDir)) throw new NotFoundException('Archivo no encontrado');
    await fs.access(full).catch(() => {
      throw new NotFoundException('El archivo ya no está en el servidor');
    });
    return { stream: createReadStream(full), name: f.originalName, mime: f.mime ?? 'application/octet-stream', size: f.sizeBytes };
  }

  async remove(id: string) {
    const q = await this.db.query.quotes.findFirst({ where: eq(quotes.id, id), with: { files: true } });
    if (!q) throw new NotFoundException('Pedido no encontrado');
    await this.db.delete(quotes).where(eq(quotes.id, id));
    await Promise.all(q.files.map((f) => fs.unlink(join(this.privateDir, ...f.path.split('/'))).catch(() => undefined)));
    return { id, label: `${q.code} · ${q.customerName}` };
  }

  async counts() {
    const since = new Date(Date.now() - 7 * 864e5);
    const [[n], [w]] = await Promise.all([
      this.db.select({ n: count() }).from(quotes).where(eq(quotes.status, 'NEW')),
      this.db.select({ n: count() }).from(quotes).where(gte(quotes.createdAt, since)),
    ]);
    return { new: n.n, week: w.n };
  }
}
