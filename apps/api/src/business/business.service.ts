import { waNumber } from '../common/utils/phone';
import { Injectable } from '@nestjs/common';
import { asc, count, eq, gte } from 'drizzle-orm';
import { nowInStoreTz, toMinutes } from '../common/utils/time';
import { Database, InjectDb } from '../db/db.module';
import { openingHours, products, Season, settings, specialDays, works } from '../db/schema';

export interface BusinessInfo {
  name: string;
  tagline: string;
  description: string;
  owner?: string;
  phone: string;
  /** Número para wa.me, sólo dígitos con código de país (5491150633206) */
  whatsapp: string;
  whatsappGreeting?: string;
  email?: string;
  address: string;
  crossStreets?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
  instagram: string;
  instagramUrl: string;
  serviceArea: string[];
  shipping?: string;
  paymentMethods: string[];
  credentials?: string;
  stats?: { posts?: number; followers?: number; since?: number };
  [key: string]: unknown;
}

export interface SeasonConfig {
  mode: 'AUTO' | 'REGULAR' | 'SUMMER';
  summerStart: string;
  summerEnd: string;
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Injectable()
export class BusinessService {
  constructor(@InjectDb() private readonly db: Database) {}

  async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.query.settings.findFirst({ where: eq(settings.key, key) });
    return (row?.value as T) ?? fallback;
  }

  async setSetting(key: string, value: unknown) {
    // El WhatsApp se guarda listo para wa.me (54 9 + área + número)
    if (key === 'business' && value && typeof value === 'object' && typeof (value as BusinessInfo).whatsapp === 'string') {
      value = { ...(value as BusinessInfo), whatsapp: waNumber((value as BusinessInfo).whatsapp) };
    }
    const [row] = await this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
      .returning();
    return row;
  }

  async allSettings() {
    const rows = await this.db.select().from(settings).orderBy(asc(settings.key));
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  seasonConfig(): Promise<SeasonConfig> {
    return this.getSetting<SeasonConfig>('season', { mode: 'AUTO', summerStart: '12-15', summerEnd: '03-15' });
  }

  /** Temporada vigente: verano en la costa (horario extendido) o resto del año */
  async currentSeason(date = new Date()): Promise<Season> {
    const cfg = await this.seasonConfig();
    if (cfg.mode !== 'AUTO') return cfg.mode;
    const { month, day } = nowInStoreTz(date);
    const md = month * 100 + day;
    const [sm, sd] = cfg.summerStart.split('-').map(Number);
    const [em, ed] = cfg.summerEnd.split('-').map(Number);
    const start = sm * 100 + sd;
    const end = em * 100 + ed;
    const inSummer = start <= end ? md >= start && md <= end : md >= start || md <= end;
    return inSummer ? 'SUMMER' : 'REGULAR';
  }

  /** Estado "abierto ahora", próximos horarios y grilla semanal */
  async status(date = new Date()) {
    const now = nowInStoreTz(date);
    const [slots, special, cfg] = await Promise.all([
      this.db.select().from(openingHours).orderBy(asc(openingHours.season), asc(openingHours.weekday), asc(openingHours.opens)),
      this.db.select().from(specialDays).where(gte(specialDays.date, now.ymd)).orderBy(asc(specialDays.date)).limit(10),
      this.seasonConfig(),
    ]);
    let season = await this.currentSeason(date);
    // Si no hay horarios cargados para verano, se usan los del resto del año
    if (season === 'SUMMER' && !slots.some((s) => s.season === 'SUMMER')) season = 'REGULAR';
    const configured = slots.length > 0;

    const seasonSlots = slots.filter((s) => s.season === season);
    const todaySpecial = special.find((s) => s.date === now.ymd);
    let today = seasonSlots.filter((s) => s.weekday === now.weekday).map((s) => ({ opens: s.opens, closes: s.closes }));
    if (todaySpecial) {
      today = todaySpecial.closed ? [] : todaySpecial.opens && todaySpecial.closes ? [{ opens: todaySpecial.opens, closes: todaySpecial.closes }] : today;
    }

    const current = today.find((s) => now.minutes >= toMinutes(s.opens) && now.minutes < toMinutes(s.closes));
    const nextToday = today.find((s) => toMinutes(s.opens) > now.minutes);

    let next: { weekday: number; dayLabel: string; opens: string } | null = null;
    if (!current && configured) {
      if (nextToday) next = { weekday: now.weekday, dayLabel: 'Hoy', opens: nextToday.opens };
      else {
        for (let i = 1; i <= 7; i++) {
          const wd = (now.weekday + i) % 7;
          const first = seasonSlots.find((s) => s.weekday === wd);
          if (first) {
            next = { weekday: wd, dayLabel: i === 1 ? 'Mañana' : WEEKDAYS[wd], opens: first.opens };
            break;
          }
        }
      }
    }

    const closesInMinutes = current ? toMinutes(current.closes) - now.minutes : null;
    const week = (s: Season) =>
      [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
        weekday: wd,
        label: WEEKDAYS[wd],
        ranges: slots.filter((x) => x.season === s && x.weekday === wd).map((x) => ({ opens: x.opens, closes: x.closes })),
      }));

    return {
      configured,
      season,
      seasonConfig: cfg,
      weekday: now.weekday,
      isOpen: !!current,
      closesAt: current?.closes ?? null,
      closingSoon: closesInMinutes !== null && closesInMinutes <= 30,
      next,
      today,
      todaySpecial: todaySpecial ? { label: todaySpecial.label, closed: todaySpecial.closed } : null,
      upcomingSpecialDays: special,
      weeks: { REGULAR: week('REGULAR'), SUMMER: week('SUMMER') },
      hasSummer: slots.some((s) => s.season === 'SUMMER'),
    };
  }

  async publicBusiness() {
    const [info, hours, [w], [p]] = await Promise.all([
      this.getSetting<BusinessInfo | null>('business', null),
      this.status(),
      this.db.select({ n: count() }).from(works).where(eq(works.active, true)),
      this.db.select({ n: count() }).from(products).where(eq(products.active, true)),
    ]);
    return { info, hours, counts: { works: w.n, products: p.n } };
  }

  // ---------- Admin ----------
  hoursAll() {
    return this.db.select().from(openingHours).orderBy(asc(openingHours.season), asc(openingHours.weekday), asc(openingHours.opens));
  }

  async replaceHours(slots: { season: Season; weekday: number; opens: string; closes: string }[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(openingHours);
      if (slots.length) await tx.insert(openingHours).values(slots);
    });
    return { items: await this.hoursAll(), label: 'horarios' };
  }

  specialDaysAll() {
    return this.db.select().from(specialDays).orderBy(asc(specialDays.date));
  }

  async createSpecialDay(data: { date: string; label: string; closed?: boolean; opens?: string; closes?: string }) {
    const [row] = await this.db.insert(specialDays).values({ ...data, date: data.date.slice(0, 10) }).returning();
    return row;
  }

  async removeSpecialDay(id: string) {
    const [row] = await this.db.delete(specialDays).where(eq(specialDays.id, id)).returning();
    return row ?? { ok: true };
  }
}
