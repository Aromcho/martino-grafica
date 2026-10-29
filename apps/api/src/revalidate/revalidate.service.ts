import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Etiquetas de caché del sitio público (Next.js revalidateTag) */
export type PublicTag = 'business' | 'catalog' | 'works' | 'content' | 'store';
export const ALL_TAGS: PublicTag[] = ['business', 'catalog', 'works', 'content', 'store'];

/**
 * Avisa al sitio Next.js que hubo cambios para que refresque su caché al instante.
 * Agrupa los avisos que llegan juntos (200 ms) en un solo request.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger('Revalidate');
  private pending = new Set<PublicTag>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly config: ConfigService) {}

  trigger(tags: PublicTag[]) {
    tags.forEach((t) => this.pending.add(t));
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 200);
  }

  private async flush() {
    const tags = [...this.pending];
    this.pending.clear();
    this.timer = null;
    if (!tags.length) return;
    const base = (this.config.get<string>('WEB_INTERNAL_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/revalidate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.config.get<string>('REVALIDATE_SECRET') ?? '' },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) this.logger.warn(`El sitio respondió ${res.status} al revalidar [${tags.join(', ')}]`);
    } catch (err) {
      this.logger.warn(`No se pudo avisar al sitio (${(err as Error).message}). Los cambios se verán al vencer la caché.`);
    }
  }
}
