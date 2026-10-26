'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Loader2, Search, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Img } from '@/components/ui/img';
import { get, uploadMedia } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import type { Media, Paginated } from '@/lib/types';
import { SortableList } from './sortable';
import { Btn, EditorDrawer } from './ui';

/** Subida con arrastrar y soltar, con progreso por archivo. Las fotos se optimizan en el servidor. */
export function UploadDrop({ onUploaded, multiple = true, compact, accept = 'image/*' }: { onUploaded: (m: Media[]) => void; multiple?: boolean; compact?: boolean; accept?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const qc = useQueryClient();

  const handle = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
      if (!list.length) return toast.error('Elegí fotos (JPG, PNG, WebP o HEIC) o videos MP4');
      const done: Media[] = [];
      // De a una para no saturar al servidor (cada foto se procesa en 3 tamaños)
      for (const f of multiple ? list : list.slice(0, 1)) {
        try {
          const m = await uploadMedia(f, f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), (p) => setProgress((s) => ({ ...s, [f.name]: p })));
          done.push(m);
        } catch (e) {
          toast.error(`No se pudo subir ${f.name}`, { description: (e as Error).message });
        } finally {
          setProgress((s) => {
            const n = { ...s };
            delete n[f.name];
            return n;
          });
        }
      }
      if (done.length) {
        qc.invalidateQueries({ queryKey: ['media'] });
        toast.success(done.length === 1 ? 'Foto subida' : `${done.length} archivos subidos`);
        onUploaded(done);
      }
    },
    [onUploaded, qc, multiple],
  );

  const uploading = Object.keys(progress).length > 0;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed text-center transition-colors',
        compact ? 'aspect-[4/5] p-2' : 'px-6 py-8',
        over ? 'border-cut bg-cut/5' : 'border-black/20 bg-white/70 hover:border-black/40',
      )}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => e.target.files && handle(e.target.files)} />
      {uploading ? (
        <div className="w-full space-y-2">
          {Object.entries(progress).map(([name, p]) => (
            <div key={name} className="text-left text-xs text-slate">
              <p className="truncate">{name}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}
          {Object.values(progress).every((p) => p >= 100) && <p className="text-xs text-slate">Optimizando…</p>}
        </div>
      ) : (
        <>
          <Upload className="size-6 text-ink/70" aria-hidden="true" />
          {!compact && <p className="text-sm font-bold text-ink">Arrastrá fotos acá</p>}
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md bg-ink px-3.5 py-2 text-sm font-bold text-white">
            {compact ? 'Subir' : 'Elegir archivos'}
          </button>
          {!compact && <p className="text-xs text-slate">JPG, PNG, WebP o HEIC. Se optimizan solas (WebP en 3 tamaños).</p>}
        </>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Biblioteca de medios para elegir una o varias fotos */
export function MediaLibrary({ selected, onToggle, kind = 'IMAGE' }: { selected: string[]; onToggle: (m: Media) => void; kind?: 'IMAGE' | 'VIDEO' }) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const query = useInfiniteQuery({
    queryKey: ['media', kind, q],
    queryFn: ({ pageParam }) => get<Paginated<Media>>(`/admin/media?page=${pageParam}&pageSize=48&kind=${kind}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div>
      <UploadDrop onUploaded={(ms) => ms.forEach(onToggle)} />
      <label className="relative mt-4 block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
        <span className="sr-only">Buscar fotos</span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por descripción (ej. camioneta, neón)" className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-sm text-ink outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink" />
      </label>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((m) => {
          const on = selected.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => onToggle(m)} className={cn('group relative overflow-hidden rounded ring-2 transition', on ? 'ring-ink' : 'ring-transparent hover:ring-black/20')} aria-pressed={on} aria-label={m.alt ?? 'Foto'}>
              <Img media={m} ratio="4/5" sizes="140px" />
              <span className={cn('absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full transition', on ? 'bg-lime text-ink' : 'bg-white/85 text-transparent group-hover:text-slate')}>
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
      {query.isLoading && <Loader2 className="mx-auto mt-6 size-6 animate-spin text-slate" />}
      {!query.isLoading && items.length === 0 && <p className="mt-6 text-center text-sm text-slate">No hay fotos con esa búsqueda.</p>}
      {query.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Btn variant="ghost" size="sm" onClick={() => query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
          </Btn>
        </div>
      )}
    </div>
  );
}

/** Fotos de un servicio, trabajo o historia: ordenar arrastrando, quitar, subir o elegir de la biblioteca */
export function ImagesField({ value, onChange, max = 40, label = 'Fotos', hint = 'Arrastrá para ordenar. La primera es la portada.' }: { value: Media[]; onChange: (v: Media[]) => void; max?: number; label?: string; hint?: string }) {
  const [libOpen, setLibOpen] = useState(false);
  const toggle = (m: Media) => {
    if (value.some((v) => v.id === m.id)) onChange(value.filter((v) => v.id !== m.id));
    else if (value.length < max) onChange([...value, m]);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">
          {label} <span className="tabular font-normal text-slate">({value.length})</span>
        </span>
        <button type="button" onClick={() => setLibOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink underline-offset-4 hover:underline">
          <ImagePlus className="size-4" /> Elegir de la biblioteca
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        <SortableList
          items={value}
          onChange={onChange}
          layout="grid"
          className="contents"
          render={(m, handle, i) => (
            <div className="relative">
              <Img media={m} ratio="4/5" sizes="120px" className="rounded" />
              {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-lime px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">Portada</span>}
              <span className="absolute left-1 top-1 rounded-md bg-white/90">{handle}</span>
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== m.id))} className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-black/10" aria-label="Quitar foto">
                <X className="size-3.5" />
              </button>
            </div>
          )}
        />
        {value.length < max && <UploadDrop compact onUploaded={(ms) => onChange([...value, ...ms].slice(0, max))} />}
      </div>
      {hint && <p className="mt-2 text-xs text-slate">{hint}</p>}
      <EditorDrawer open={libOpen} onClose={() => setLibOpen(false)} title="Biblioteca de medios" footer={<Btn className="w-full" onClick={() => setLibOpen(false)}>Listo ({value.length})</Btn>}>
        <MediaLibrary selected={value.map((v) => v.id)} onToggle={toggle} />
      </EditorDrawer>
    </div>
  );
}

/** Una sola foto (portada de rubro, banner) */
export function SingleImageField({ value, onChange, label }: { value: Media | null; onChange: (m: Media | null) => void; label: string }) {
  const [libOpen, setLibOpen] = useState(false);
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-start gap-3">
        <div className="w-28 shrink-0">
          {value ? (
            <div className="relative">
              <Img media={value} ratio="4/5" sizes="112px" className="rounded" />
              <button type="button" onClick={() => onChange(null)} className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-white shadow ring-1 ring-black/10" aria-label="Quitar">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <UploadDrop compact multiple={false} onUploaded={(ms) => onChange(ms[0] ?? null)} />
          )}
        </div>
        <button type="button" onClick={() => setLibOpen(true)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-ink hover:bg-black/5">
          <ImagePlus className="size-4" /> Elegir de la biblioteca
        </button>
      </div>
      <EditorDrawer open={libOpen} onClose={() => setLibOpen(false)} title="Elegir foto">
        <MediaLibrary
          selected={value ? [value.id] : []}
          onToggle={(m) => {
            onChange(m);
            setLibOpen(false);
          }}
        />
      </EditorDrawer>
    </div>
  );
}
