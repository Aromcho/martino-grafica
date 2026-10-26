import { SetMetadata } from '@nestjs/common';
import type { PublicTag } from '../../revalidate/revalidate.service';

export const TRACK_KEY = 'track';
export interface TrackMeta {
  /** Entidad para el registro de actividad: "producto", "trabajo"… */
  entity: string;
  /** Etiquetas del sitio público a refrescar */
  tags: PublicTag[];
  /** Acción explícita (si no, se deduce del método HTTP) */
  action?: string;
}

/** Marca un endpoint del panel: registra la actividad y refresca el sitio público al terminar bien */
export const Track = (entity: string, tags: PublicTag[], action?: string) => SetMetadata(TRACK_KEY, { entity, tags, action } satisfies TrackMeta);
