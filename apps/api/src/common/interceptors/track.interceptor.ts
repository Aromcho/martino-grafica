import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { ActivityService } from '../../activity/activity.service';
import { RevalidateService } from '../../revalidate/revalidate.service';
import { TRACK_KEY, type TrackMeta } from '../decorators/track.decorator';

const ACTIONS: Record<string, string> = { POST: 'creó', PATCH: 'editó', PUT: 'actualizó', DELETE: 'eliminó' };

@Injectable()
export class TrackInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activity: ActivityService,
    private readonly revalidate: RevalidateService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<TrackMeta | undefined>(TRACK_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!meta) return next.handle();
    const req = ctx.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    if (req.method === 'GET') return next.handle();

    return next.handle().pipe(
      tap((result) => {
        if (meta.tags.length) this.revalidate.trigger(meta.tags);
        const r = (result ?? {}) as Record<string, unknown>;
        const label = (r.name ?? r.title ?? r.code ?? r.label ?? r.customerName ?? null) as string | null;
        const entityId = (r.id as string | undefined) ?? (req.params?.id as string | undefined) ?? null;
        void this.activity.log({
          userId: req.user?.id ?? null,
          action: meta.action ?? ACTIONS[req.method] ?? req.method.toLowerCase(),
          entity: meta.entity,
          entityId,
          label: typeof label === 'string' ? label : null,
        });
      }),
    );
  }
}
