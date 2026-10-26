import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service';
import { BusinessService } from '../business/business.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { mediaColumns } from '../common/media';
import { Database, InjectDb } from '../db/db.module';
import { categories, highlights, media, products, quotes, works } from '../db/schema';

@ApiTags('admin / dashboard')
@Controller('admin/stats')
@UseGuards(AdminGuard)
export class StatsController {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly business: BusinessService,
    private readonly activity: ActivityService,
  ) {}

  @Get()
  async dashboard() {
    const since7 = new Date(Date.now() - 7 * 864e5);
    const since30 = new Date(Date.now() - 30 * 864e5);
    const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
    const [
      quotesNew,
      quotes7,
      quotes30,
      inProgress,
      worksCount,
      productsCount,
      categoriesCount,
      highlightsCount,
      mediaCount,
      byStatus,
      daily,
      recentQuotes,
      topWorks,
      topProducts,
      topRequested,
      hours,
      recentActivity,
    ] = await Promise.all([
      n(this.db.select({ n: count() }).from(quotes).where(eq(quotes.status, 'NEW'))),
      n(this.db.select({ n: count() }).from(quotes).where(gte(quotes.createdAt, since7))),
      n(this.db.select({ n: count() }).from(quotes).where(gte(quotes.createdAt, since30))),
      n(this.db.select({ n: count() }).from(quotes).where(sql`${quotes.status} in ('APPROVED','IN_PRODUCTION','READY')`)),
      n(this.db.select({ n: count() }).from(works).where(eq(works.active, true))),
      n(this.db.select({ n: count() }).from(products).where(eq(products.active, true))),
      n(this.db.select({ n: count() }).from(categories)),
      n(this.db.select({ n: count() }).from(highlights).where(eq(highlights.active, true))),
      n(this.db.select({ n: count() }).from(media)),
      this.db.select({ status: quotes.status, n: count() }).from(quotes).groupBy(quotes.status),
      this.db.execute<{ day: string; n: number }>(
        sql`SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n FROM quotes WHERE created_at >= ${since30} GROUP BY 1 ORDER BY 1`,
      ),
      this.db.query.quotes.findMany({ orderBy: [desc(quotes.createdAt)], limit: 6, with: { files: { columns: { id: true } } } }),
      this.db.query.works.findMany({
        where: eq(works.active, true),
        orderBy: [desc(works.views)],
        limit: 5,
        columns: { id: true, slug: true, title: true, views: true },
        with: { cover: { columns: mediaColumns } },
      }),
      this.db.query.products.findMany({ where: eq(products.active, true), orderBy: [desc(products.views)], limit: 5, columns: { id: true, slug: true, name: true, views: true } }),
      this.db
        .select({ name: quotes.productName, n: count() })
        .from(quotes)
        .where(and(gte(quotes.createdAt, since30), sql`${quotes.productName} is not null`))
        .groupBy(quotes.productName)
        .orderBy(desc(count()))
        .limit(5),
      this.business.status(),
      this.activity.recent(15),
    ]);

    return {
      totals: { quotesNew, quotes7, quotes30, inProgress, works: worksCount, products: productsCount, categories: categoriesCount, highlights: highlightsCount, media: mediaCount },
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s.n])),
      daily: daily.rows.map((d) => ({ day: d.day, count: Number(d.n) })),
      recentQuotes: recentQuotes.map(({ files, ...q }) => ({ ...q, fileCount: files.length })),
      topWorks,
      topProducts,
      topRequested,
      hours: { configured: hours.configured, isOpen: hours.isOpen, closesAt: hours.closesAt, next: hours.next },
      activity: recentActivity,
    };
  }

  @Get('activity')
  activityLog() {
    return this.activity.recent(100);
  }
}
