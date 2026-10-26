'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UploadDrop } from '@/components/admin/media';
import { SortableList } from '@/components/admin/sortable';
import { Btn, DeleteButton, EditorDrawer, EmptyState, Field, Input, LoadingBlock, PageHeader, SegmentedTabs } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation } from '@/lib/admin';
import { get } from '@/lib/client-api';
import { fileSize, formatDate } from '@/lib/format';
import { absoluteMediaUrl, mediaUrl } from '@/lib/media';
import type { MediaFull, Paginated } from '@/lib/types';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function MediaPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [open, setOpen] = useState<MediaFull | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['media', 'admin', kind, q],
    queryFn: ({ pageParam }) => get<Paginated<MediaFull>>(`/admin/media?page=${pageParam}&pageSize=60&kind=${kind}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const [items, setItems] = useState<MediaFull[]>([]);
  useEffect(() => setItems(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  const reorder = useAdminMutation<string[]>({ method: 'PUT', path: '/admin/media/order', body: (ids) => ({ ids }), invalidate: [['media']], success: 'Orden guardado' });

  return (
    <>
      <PageHeader title="Medios" text="Todas las fotos y videos de la web. Lo que subas acá se puede usar en trabajos, servicios, historias y banners." />
      <UploadDrop accept="image/*,video/mp4,video/webm,video/quicktime" onUploaded={() => qc.invalidateQueries({ queryKey: ['media'] })} />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegmentedTabs
          value={kind}
          onChange={setKind}
          options={[
            { value: 'IMAGE', label: 'Fotos' },
            { value: 'VIDEO', label: 'Videos' },
          ]}
        />
        <label className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <span className="sr-only">Buscar</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por descripción u origen" className="h-10 w-full rounded-lg bg-white pl-10 pr-3 text-sm outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
        </label>
        <span className="tabular text-sm text-slate">{total} archivos</span>
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title={q ? 'No hay archivos con esa búsqueda' : 'Todavía no hay archivos'} text="Arrastrá fotos al recuadro de arriba para subirlas." />
        ) : (
          <SortableList
            items={items}
            layout="grid"
            disabled={!!q}
            onChange={(next) => {
              setItems(next);
              reorder.mutate(next.map((m) => m.id));
            }}
            className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
            render={(m, handle) => (
              <div className="group relative overflow-hidden rounded bg-white ring-1 ring-black/8">
                <button type="button" onClick={() => setOpen(m)} className="block w-full" aria-label={`Ver ${m.alt ?? 'archivo'}`}>
                  {m.kind === 'VIDEO' ? (
                    <video src={mediaUrl(m.path)} muted playsInline preload="metadata" className="aspect-[4/5] w-full bg-ink object-cover" />
                  ) : (
                    <Img media={m} ratio="4/5" sizes="140px" />
                  )}
                </button>
                {handle && <span className="absolute left-1 top-1 rounded-md bg-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">{handle}</span>}
              </div>
            )}
          />
        )}
        {query.hasNextPage && (
          <div className="mt-5 flex justify-center">
            <Btn variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />} Ver más
            </Btn>
          </div>
        )}
        {!q && items.length > 1 && <p className="mt-3 text-xs text-slate">Arrastrá desde la manija para ordenar la biblioteca.</p>}
      </div>
      {open && <MediaEditor key={open.id} m={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function MediaEditor({ m, onClose }: { m: MediaFull; onClose: () => void }) {
  const [alt, setAlt] = useState(m.alt ?? '');
  const save = useAdminMutation<{ alt: string }>({ method: 'PATCH', path: `/admin/media/${m.id}`, invalidate: [['media']], success: 'Descripción guardada', onSuccess: onClose });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/media/${m.id}`, invalidate: [['media']], success: 'Archivo eliminado', onSuccess: onClose });
  const url = absoluteMediaUrl(m.variants?.lg ?? m.path);
  return (
    <EditorDrawer
      open
      onClose={onClose}
      title={m.kind === 'VIDEO' ? 'Video' : 'Foto'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <DeleteButton onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} />
          <Btn onClick={() => save.mutate({ alt: alt.trim() })} disabled={save.isPending}>
            Guardar
          </Btn>
        </div>
      }
    >
      <div className="space-y-5">
        {m.kind === 'VIDEO' ? <video src={mediaUrl(m.path)} controls muted playsInline className="w-full rounded bg-ink" /> : <Img media={m} sizes="560px" fit="contain" className="max-h-[50vh] rounded bg-liner" style={{ aspectRatio: m.width && m.height ? `${m.width}/${m.height}` : '4/5' }} />}
        <Field label="Descripción" hint="La leen los buscadores y los lectores de pantalla. Describí lo que se ve.">
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Camioneta ploteada con vinilo impreso" />
        </Field>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {m.width && m.height && (
            <div>
              <dt className="text-slate">Tamaño</dt>
              <dd className="tabular font-semibold">
                {m.width} × {m.height}
              </dd>
            </div>
          )}
          {m.sizeBytes && (
            <div>
              <dt className="text-slate">Peso</dt>
              <dd className="tabular font-semibold">{fileSize(m.sizeBytes)}</dd>
            </div>
          )}
          {m.source && (
            <div>
              <dt className="text-slate">Origen</dt>
              <dd className="truncate font-semibold">{m.source}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate">Subido</dt>
            <dd className="font-semibold">{formatDate(m.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
          </div>
        </dl>
        <Btn
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => toast.success('Link copiado'));
          }}
        >
          <Copy className="size-4" /> Copiar link
        </Btn>
        <p className="text-xs text-slate">Si la foto está usada en un trabajo, servicio o historia, al eliminarla desaparece de ahí también.</p>
      </div>
    </EditorDrawer>
  );
}
