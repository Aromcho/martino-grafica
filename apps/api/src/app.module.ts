import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CatalogModule } from './catalog/catalog.module';
import { PgExceptionFilter } from './common/filters/pg-exception.filter';
import { TrackInterceptor } from './common/interceptors/track.interceptor';
import { ContentModule } from './content/content.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { QuotesModule } from './quotes/quotes.module';
import { RevalidateModule } from './revalidate/revalidate.module';
import { SearchModule } from './search/search.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { WorksModule } from './works/works.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    DbModule,
    RevalidateModule,
    ActivityModule,
    AuthModule,
    UsersModule,
    MediaModule,
    BusinessModule,
    CatalogModule,
    WorksModule,
    ContentModule,
    QuotesModule,
    SearchModule,
    StatsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PgExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TrackInterceptor },
  ],
})
export class AppModule {}
