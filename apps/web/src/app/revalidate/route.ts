import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED = new Set(['business', 'catalog', 'works', 'content']);

/**
 * La API avisa acá cada vez que se guarda algo en el panel (con un secreto compartido),
 * y el sitio refresca al instante sólo las partes afectadas.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags = (body.tags ?? []).filter((t) => ALLOWED.has(t));
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ revalidated: tags, at: new Date().toISOString() });
}
