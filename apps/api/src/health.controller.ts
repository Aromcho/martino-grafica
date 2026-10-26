import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { Database, InjectDb } from './db/db.module';

@ApiTags('salud')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get()
  async health() {
    await this.db.execute(sql`SELECT 1`);
    return { ok: true, time: new Date().toISOString() };
  }
}
