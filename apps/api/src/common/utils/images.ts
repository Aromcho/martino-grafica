import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import type { Database } from '../../db/db.module';
import { media } from '../../db/schema';
import { mediaColumns } from '../media';

/** Reemplaza el set ordenado de imágenes de una entidad (productos, trabajos) */
export async function replaceImages(
  db: Database,
  table: typeof import('../../db/schema').productImages | typeof import('../../db/schema').workImages,
  ownerKey: 'productId' | 'workId',
  ownerId: string,
  mediaIds: string[],
) {
  const ids = [...new Set(mediaIds)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;
  const ownerCol = t[ownerKey];
  await db.transaction(async (tx) => {
    if (ids.length) await tx.delete(t).where(and(eq(ownerCol, ownerId), notInArray(t.mediaId, ids)));
    else await tx.delete(t).where(eq(ownerCol, ownerId));
    for (let i = 0; i < ids.length; i++) {
      await tx
        .insert(t)
        .values({ [ownerKey]: ownerId, mediaId: ids[i], sortOrder: i })
        .onConflictDoUpdate({ target: [ownerCol, t.mediaId], set: { sortOrder: i } });
    }
  });
}

export async function mediaByIds(db: Database, ids: string[]) {
  if (!ids.length) return [];
  return db.query.media.findMany({ where: inArray(media.id, ids), columns: mediaColumns, orderBy: [asc(media.sortOrder)] });
}

/** Reordena filas de una tabla con columna sortOrder según la lista de ids */
export async function reorderRows(db: Database, table: { id: unknown; sortOrder: unknown }, ids: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) await tx.update(t).set({ sortOrder: i }).where(eq(t.id, ids[i]));
  });
  return { ok: true, label: `${ids.length} elementos` };
}
