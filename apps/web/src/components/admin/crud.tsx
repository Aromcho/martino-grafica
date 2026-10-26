'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Img } from '@/components/ui/img';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import type { Media } from '@/lib/types';
import { SingleImageField } from './media';
import { SortableList } from './sortable';
import { Badge, Btn, DeleteButton, EditorDrawer, EmptyState, Field, Input, LinesInput, LoadingBlock, PageHeader, Select, Switch, Textarea } from './ui';

export type FieldSpec =
  | { key: string; label: string; type: 'text' | 'textarea' | 'datetime'; hint?: string; required?: boolean; placeholder?: string }
  | { key: string; label: string; type: 'lines'; hint?: string; placeholder?: string }
  | { key: string; label: string; type: 'switch'; hint?: string; default?: boolean }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; hint?: string }
  | { key: string; label: string; type: 'image'; mediaKey: string };

type Row = Record<string, unknown> & { id: string };

interface Props {
  title: string;
  text?: string;
  queryKey: string;
  listPath: string;
  basePath: string;
  fields: FieldSpec[];
  rowTitle: (r: Row) => string;
  rowSubtitle?: (r: Row) => ReactNode;
  rowImage?: (r: Row) => Media | null | undefined;
  rowBadges?: (r: Row) => ReactNode;
  /** PUT con { ids } para guardar el orden al arrastrar */
  reorderPath?: string;
  newLabel?: string;
  defaults?: Record<string, unknown>;
  canCreate?: boolean;
  canDelete?: boolean;
}

/** Listado ordenable + editor lateral para entidades simples del panel */
export function CrudPage(p: Props) {
  const list = useAdminQuery<Row[]>([p.queryKey], p.listPath);
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  useEffect(() => setItems(list.data ?? []), [list.data]);

  const reorder = useAdminMutation<string[]>({ method: 'PUT', path: p.reorderPath ?? '', body: (ids) => ({ ids }), invalidate: [[p.queryKey]], success: 'Orden guardado' });

  return (
    <>
      <PageHeader
        title={p.title}
        text={p.text}
        actions={
          p.canCreate !== false && (
            <Btn onClick={() => setEditing('new')}>
              <Plus className="size-4" /> {p.newLabel ?? 'Agregar'}
            </Btn>
          )
        }
      />
      {list.isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay nada cargado" action={p.canCreate !== false && <Btn onClick={() => setEditing('new')}>{p.newLabel ?? 'Agregar'}</Btn>} />
      ) : (
        <SortableList
          items={items}
          disabled={!p.reorderPath}
          onChange={(next) => {
            setItems(next);
            reorder.mutate(next.map((i) => i.id));
          }}
          className="space-y-2"
          render={(r, handle) => (
            <div className="flex items-center gap-3 rounded-md bg-white p-2.5 pr-3 ring-1 ring-black/8">
              {handle}
              {p.rowImage && <Img media={p.rowImage(r)} ratio="1/1" sizes="56px" className="w-14 shrink-0 rounded" />}
              <button type="button" onClick={() => setEditing(r)} className="min-w-0 flex-1 py-1 text-left">
                <span className="block truncate font-bold text-ink">{p.rowTitle(r)}</span>
                {p.rowSubtitle && <span className="block truncate text-sm text-slate">{p.rowSubtitle(r)}</span>}
              </button>
              {p.rowBadges && <span className="flex shrink-0 flex-wrap justify-end gap-1.5">{p.rowBadges(r)}</span>}
            </div>
          )}
        />
      )}
      {p.reorderPath && items.length > 1 && <p className="mt-3 text-xs text-slate">Arrastrá desde la manija para cambiar el orden en la web.</p>}
      {editing && <Editor key={editing === 'new' ? 'new' : editing.id} {...p} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

const toLocalInput = (iso: unknown) => {
  if (!iso) return '';
  const d = new Date(String(iso));
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

function Editor(p: Props & { row: Row | null; onClose: () => void }) {
  const init = () => {
    const v: Record<string, unknown> = { ...(p.defaults ?? {}) };
    for (const f of p.fields) {
      if (f.type === 'image') v[f.mediaKey] = p.row?.[f.mediaKey] ?? null;
      else if (p.row && f.key in p.row) v[f.key] = f.type === 'datetime' ? toLocalInput(p.row[f.key]) : p.row[f.key];
      else if (f.type === 'switch' && v[f.key] === undefined) v[f.key] = f.default ?? true;
      else if (f.type === 'lines' && v[f.key] === undefined) v[f.key] = [];
    }
    return v;
  };
  const [v, setV] = useState<Record<string, unknown>>(init);
  const [error, setError] = useState('');
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));

  const payload = () => {
    const out: Record<string, unknown> = {};
    for (const f of p.fields) {
      if (f.type === 'image') out[f.key] = (v[f.mediaKey] as Media | null)?.id ?? null;
      else if (f.type === 'datetime') out[f.key] = v[f.key] ? new Date(String(v[f.key])).toISOString() : null;
      else if (f.type === 'text' || f.type === 'textarea') {
        const t = String(v[f.key] ?? '').trim();
        out[f.key] = t || (f.required ? '' : null);
      } else out[f.key] = v[f.key];
    }
    return out;
  };

  const save = useAdminMutation<Record<string, unknown>>({
    method: p.row ? 'PATCH' : 'POST',
    path: p.row ? `${p.basePath}/${p.row.id}` : p.basePath,
    invalidate: [[p.queryKey]],
    success: p.row ? 'Cambios guardados' : 'Creado',
    onSuccess: p.onClose,
  });
  const remove = useAdminMutation({ method: 'DELETE', path: `${p.basePath}/${p.row?.id}`, invalidate: [[p.queryKey]], success: 'Eliminado', onSuccess: p.onClose });

  const submit = () => {
    const missing = p.fields.find((f) => (f.type === 'text' || f.type === 'textarea') && f.required && !String(v[f.key] ?? '').trim());
    if (missing) return setError(`Completá «${missing.label}»`);
    setError('');
    save.mutate(payload());
  };

  return (
    <EditorDrawer
      open
      onClose={p.onClose}
      title={p.row ? p.rowTitle(p.row) : (p.newLabel ?? 'Nuevo')}
      footer={
        <div className="flex items-center justify-between gap-3">
          {p.row && p.canDelete !== false ? <DeleteButton onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} /> : <span />}
          <Btn onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Btn>
        </div>
      }
    >
      <div className="space-y-5">
        {p.fields.map((f) => {
          if (f.type === 'switch') return <Switch key={f.key} label={f.label} hint={f.hint} checked={!!v[f.key]} onChange={(c) => set(f.key, c)} />;
          if (f.type === 'image') return <SingleImageField key={f.key} label={f.label} value={(v[f.mediaKey] as Media) ?? null} onChange={(m) => set(f.mediaKey, m)} />;
          if (f.type === 'select')
            return (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <Select value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          if (f.type === 'lines')
            return (
              <Field key={f.key} label={f.label} hint={f.hint ?? 'Uno por renglón'}>
                <LinesInput value={(v[f.key] as string[]) ?? []} onChange={(x) => set(f.key, x)} placeholder={f.placeholder} />
              </Field>
            );
          if (f.type === 'textarea')
            return (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <Textarea rows={4} value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              </Field>
            );
          return (
            <Field key={f.key} label={f.label} hint={f.hint} optional={f.type === 'text' && !f.required}>
              <Input type={f.type === 'datetime' ? 'datetime-local' : 'text'} value={String(v[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} placeholder={'placeholder' in f ? f.placeholder : undefined} />
            </Field>
          );
        })}
        {error && (
          <p className="rounded bg-[#fde8e6] px-3 py-2 text-sm font-semibold text-[#912018]" role="alert">
            {error}
          </p>
        )}
      </div>
    </EditorDrawer>
  );
}

export const activeBadge = (r: Record<string, unknown>) => (r.active === false ? <Badge tone="red">Oculto</Badge> : null);
