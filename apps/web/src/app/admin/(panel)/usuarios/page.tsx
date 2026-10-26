'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Btn, DeleteButton, EditorDrawer, EmptyState, Field, Input, LoadingBlock, PageHeader, Select, Switch } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery, useMe } from '@/lib/admin';
import { timeAgo } from '@/lib/format';
import type { Role, User } from '@/lib/types';

export default function UsersPage() {
  const me = useMe();
  const list = useAdminQuery<User[]>(['admin-users'], '/admin/users', { enabled: me.data?.role === 'ADMIN' });
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  if (me.data && me.data.role !== 'ADMIN') return <EmptyState title="Sólo para administradores" text="Pedile a un administrador que te dé acceso." />;
  if (list.isLoading || !list.data) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="Usuarios"
        text="Quiénes entran al panel. Los editores cargan contenido y atienden pedidos; los administradores además cambian datos del negocio y usuarios."
        actions={
          <Btn onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nuevo usuario
          </Btn>
        }
      />
      <ul className="space-y-2">
        {list.data.map((u) => (
          <li key={u.id}>
            <button type="button" onClick={() => setEditing(u)} className="flex w-full items-center gap-3 rounded-md bg-white p-3.5 text-left ring-1 ring-black/8 hover:shadow-md">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-bold text-lime">{u.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {u.name} {u.id === me.data?.id && <span className="font-normal text-slate">(vos)</span>}
                </span>
                <span className="block truncate text-sm text-slate">
                  {u.email}
                  {u.lastLoginAt ? ` · entró ${timeAgo(u.lastLoginAt)}` : ' · todavía no entró'}
                </span>
              </span>
              <Badge tone={u.role === 'ADMIN' ? 'ink' : 'neutral'}>{u.role === 'ADMIN' ? 'Administrador' : 'Editor'}</Badge>
              {u.active === false && <Badge tone="red">Desactivado</Badge>}
            </button>
          </li>
        ))}
      </ul>
      {editing && <UserEditor key={editing === 'new' ? 'new' : editing.id} user={editing === 'new' ? null : editing} self={editing !== 'new' && editing.id === me.data?.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function UserEditor({ user, self, onClose }: { user: User | null; self: boolean; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'EDITOR');
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState('');
  const inv = [['admin-users']];
  const save = useAdminMutation<Record<string, unknown>>({ method: user ? 'PATCH' : 'POST', path: user ? `/admin/users/${user.id}` : '/admin/users', invalidate: inv, success: user ? 'Usuario guardado' : 'Usuario creado', onSuccess: onClose });
  const remove = useAdminMutation({ method: 'DELETE', path: `/admin/users/${user?.id}`, invalidate: inv, success: 'Usuario eliminado', onSuccess: onClose });
  const valid = name.trim().length >= 2 && (user || (/^\S+@\S+\.\S+$/.test(email) && password.length >= 8)) && (!password || password.length >= 8);

  return (
    <EditorDrawer
      open
      onClose={onClose}
      title={user ? user.name : 'Nuevo usuario'}
      footer={
        <div className="flex items-center justify-between gap-3">
          {user && !self ? <DeleteButton onConfirm={() => remove.mutate(undefined)} pending={remove.isPending} /> : <span />}
          <Btn
            disabled={!valid || save.isPending}
            onClick={() =>
              save.mutate(
                user
                  ? { name: name.trim(), ...(self ? {} : { role, active }), ...(password ? { password } : {}) }
                  : { name: name.trim(), email: email.trim().toLowerCase(), role, password },
              )
            }
          >
            Guardar
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user} autoComplete="off" />
        </Field>
        <Field label="Rol" hint={self ? 'No podés cambiar tu propio rol' : undefined}>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={self}>
            <option value="EDITOR">Editor: carga contenido y atiende pedidos</option>
            <option value="ADMIN">Administrador: todo, incluidos datos y usuarios</option>
          </Select>
        </Field>
        <Field label={user ? 'Nueva contraseña' : 'Contraseña'} hint={user ? 'Dejala vacía para no cambiarla. Mínimo 8 caracteres.' : 'Mínimo 8 caracteres. Pasásela por un canal privado.'}>
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {user && !self && <Switch label="Puede entrar al panel" checked={active} onChange={setActive} />}
      </div>
    </EditorDrawer>
  );
}
