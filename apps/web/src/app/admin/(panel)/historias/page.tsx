'use client';

import { ImagePlus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MediaLibrary, UploadDrop } from '@/components/admin/media';
import { SortableList } from '@/components/admin/sortable';
import { Badge, Btn, DeleteButton, EditorDrawer, EmptyState, Field, Input, LoadingBlock, PageHeader, Select, Switch } from '@/components/admin/ui';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import type { Category, Highlight, Media, Paginated, WorkCard } from '@/lib/types';

type Item = { id: string; media: Media; caption: string; workId: string };

export default function HighlightsAdminPage() {
  const list = useAdminQuery<Highlight[]>(['admin-highlights'], '/admin/highlights');
  const [items, setItems] = useState<Highlight[]>([]);
  const [editing, setEditing] = useState<Highlight | 'new' | null>(null);
  useEffect(() => setItems(list.data ?? []), [list.data]);
  const reorder = useAdminMutation<string[]>({ method: 'PUT', path: '/admin/highlights/order', body: (ids) => ({ ids }), invalidate: [['admin-highlights']], success: 'Orden guardado' });

  return (
    <>
      <PageHeader
        title="Historias"
        text="Las historias destacadas, como en Instagram: círculos en el inicio y la página de historias."
        actions={
          <Btn onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nueva historia
          </Btn>
        }
      />
      {list.isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay historias" action={<Btn onClick={() => setEditing('new')}>Crear la primera</Btn>} />
      ) : (
        <>
          <SortableList
            items={items}
            onChange={(next) => {
              setItems(next);
              reorder.mutate(next.map((h) => h.id));
            }}
            className="space-y-2"
            render={(h, handle) => (
              <div className="flex items-center gap-3 rounded-md bg-white p-2.5 pr-3 ring-1 ring-black/8">
                {handle}
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[conic-gradient(#c6f800,#f3ffc2,#c6f800)] p-[2.5px]">
                  <span className="block size-full overflow-hidden rounded-full bg-white p-[2px]">
                    <Img media={h.cover ?? h.items[0]?.media} sizes="56px" className="size-full rounded-full" />
                  </span>
                </span>
                <button type="button" onClick={() => setEditing(h)} className="min-w-0 flex-1 py-1 text-left">
                  <span className="block truncate font-bold">{h.title}</span>
                  <span className="block truncate text-sm text-slate">
                    {h.items.length} {h.items.length === 1 ? 'historia' : 'historias'}
                    {h.category ? ` · ${h.category.name}` : ''}
                  </span>
                </button>
                {!h.active && <Badge tone="red">Oculta</Badge>}
              </div>
            )}
          />
          <p className="mt-3 text-xs text-slate">Arrastrá desde la manija para cambiar el orden de los círculos.</p>
        </>
      )}
      {editing && <HighlightEditor key={editing === 'new' ? 'new' : editing.id} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function HighlightEditor({ row, onClose }: { row: Highlight | null; onClose: () => void }) {
  const cats = useAdminQuery<Category[]>(['admin-categories'], '/admin/categories');
  const works = useAdminQuery<Paginated<WorkCard>>(['admin-works-all'], '/admin/works?pageSize=120');
  const [title, setTitle] = useState(row?.title ?? '');
  const [categoryId, setCategoryId] = useState(row?.categoryId ?? '');
  const [active, setActive] = useState(row?.active ?? true);
  const [coverId, setCoverId] = useState<string | null>(row?.coverId ?? null);
  const [items, setItems] = useState<Item[]>(() => (row?.items ?? []).map((it) => ({ id: it.id, media: it.media, caption: it.caption ?? '', workId: it.workId ?? '' })));
  const [lib, setLib] = useState(false);
  const [error, setError] = useState('');

  const add = (ms: Media[]) => setItems((s) => [...s, ...ms.filter((m) => !s.some((x) => x.media.id === m.id)).map((m) => ({ id: `n-${m.id}`, media: m, caption: '', workId: '' }))]);
  const inv = [['admin-highlights']];
  const save = useAdminMutation<Record<string, unknown>>({ method: row ? 'PATCH' : 'POST', path: row ? `/admin/highlights/${row.id}` : '/admin/highlights', invalidate: inv, success: row ? 'Historia guardada' : 'Historia creada', onSuccess: onClose });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/highlights/${row?.id}`, invalidate: inv, success: 'Historia eliminada', onSuccess: onClose });

  const submit = () => {
    if (title.trim().length < 2) return setError('Poné un nombre corto (ej. «Motos»)');
    if (!items.length) return setError('Agregá al menos una foto');
    setError('');
    const cover = items.find((i) => i.media.id === coverId)?.media.id ?? items[0].media.id;
    save.mutate({
      title: title.trim(),
      categoryId: categoryId || null,
      active,
      coverId: cover,
      items: items.map((i) => ({ mediaId: i.media.id, caption: i.caption.trim() || null, workId: i.workId || null })),
    });
  };

  return (
    <EditorDrawer
      open
      wide
      onClose={onClose}
      title={row ? row.title : 'Nueva historia'}
      footer={
        <div className="flex items-center justify-between gap-3">
          {row ? <DeleteButton onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} /> : <span />}
          <Btn onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Btn>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" hint="Corto: es lo que se lee bajo el círculo">
            <Input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="Motos" />
          </Field>
          <Field label="Rubro" optional hint="El botón de la historia lleva a esos trabajos">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Ninguno</option>
              {(cats.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Switch label="Visible en la web" checked={active} onChange={setActive} />

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              Fotos de la historia <span className="tabular font-normal text-slate">({items.length})</span>
            </span>
            <button type="button" onClick={() => setLib(true)} className="inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline">
              <ImagePlus className="size-4" /> Elegir de la biblioteca
            </button>
          </div>
          <SortableList
            items={items}
            onChange={setItems}
            className="space-y-2"
            render={(it, handle, i) => (
              <div className="flex items-start gap-2.5 rounded-md bg-liner p-2">
                {handle}
                <button type="button" onClick={() => setCoverId(it.media.id)} className="relative w-16 shrink-0" aria-label="Usar como portada del círculo">
                  <Img media={it.media} ratio="9/16" sizes="64px" className="rounded" />
                  {(coverId ? coverId === it.media.id : i === 0) && <span className="absolute inset-x-0 bottom-1 mx-auto w-fit rounded bg-lime px-1 text-[0.6rem] font-bold text-ink">Portada</span>}
                </button>
                <div className="grid min-w-0 flex-1 gap-2">
                  <Input value={it.caption} onChange={(e) => setItems((s) => s.map((x) => (x.id === it.id ? { ...x, caption: e.target.value } : x)))} placeholder="Texto (opcional)" aria-label="Texto de la historia" className="h-10" />
                  <Select value={it.workId} onChange={(e) => setItems((s) => s.map((x) => (x.id === it.id ? { ...x, workId: e.target.value } : x)))} aria-label="Trabajo relacionado" className="h-10 text-sm">
                    <option value="">Sin trabajo</option>
                    {(works.data?.items ?? []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <button type="button" onClick={() => setItems((s) => s.filter((x) => x.id !== it.id))} className="grid size-9 shrink-0 place-items-center rounded-md text-slate hover:bg-black/5" aria-label="Quitar foto">
                  <X className="size-4" />
                </button>
              </div>
            )}
          />
          <div className="mt-3">
            <UploadDrop onUploaded={add} />
          </div>
          <p className="mt-2 text-xs text-slate">Tocá una foto para usarla de portada del círculo. Vinculá un trabajo para que la historia tenga el botón «Ver el trabajo».</p>
        </div>
        {error && (
          <p className="rounded bg-[#fde8e6] px-3 py-2 text-sm font-semibold text-[#912018]" role="alert">
            {error}
          </p>
        )}
      </div>
      <EditorDrawer open={lib} onClose={() => setLib(false)} title="Elegir fotos" footer={<Btn className="w-full" onClick={() => setLib(false)}>Listo ({items.length})</Btn>}>
        <MediaLibrary
          selected={items.map((i) => i.media.id)}
          onToggle={(m) => (items.some((i) => i.media.id === m.id) ? setItems((s) => s.filter((x) => x.media.id !== m.id)) : add([m]))}
        />
      </EditorDrawer>
    </EditorDrawer>
  );
}
