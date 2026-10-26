import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { Database, InjectDb } from '../db/db.module';
import { activity, users } from '../db/schema';

@Injectable()
export class ActivityService {
  constructor(@InjectDb() private readonly db: Database) {}

  async log(entry: { userId?: string | null; action: string; entity: string; entityId?: string | null; label?: string | null }) {
    await this.db
      .insert(activity)
      .values({ ...entry, label: entry.label?.slice(0, 200) ?? null })
      .catch(() => undefined);
  }

  recent(limit = 20) {
    return this.db
      .select({
        id: activity.id,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        label: activity.label,
        createdAt: activity.createdAt,
        userName: users.name,
      })
      .from(activity)
      .leftJoin(users, eq(users.id, activity.userId))
      .orderBy(desc(activity.createdAt))
      .limit(limit);
  }
}
