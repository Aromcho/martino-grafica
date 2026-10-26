'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Field, Input, LinesInput, LoadingBlock, PageHeader, SaveBar, Textarea } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery, useMe } from '@/lib/admin';
import { HttpError, post } from '@/lib/client-api';
import type { BusinessInfo } from '@/lib/types';

type Settings = { business?: BusinessInfo };

const TEXT: { key: keyof BusinessInfo; label: string; hint?: string; area?: boolean }[] = [
  { key: 'name', label: 'Nombre del negocio' },
  { key: 'tagline', label: 'Frase corta', hint: 'Se usa en el pie de página' },
  { key: 'description', label: 'Descripción', hint: 'Para Google y para la página «El taller»', area: true },
  { key: 'owner', label: 'Responsable' },
  { key: 'credentials', label: 'Formación o certificaciones', area: true },
];
const CONTACT: { key: keyof BusinessInfo; label: string; hint?: string }[] = [
  { key: 'phone', label: 'Teléfono (como se muestra)', hint: '+54 11 5063-3206' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Con código de área. Se convierte solo al formato de WhatsApp (549…)' },
  { key: 'whatsappGreeting', label: 'Mensaje inicial de WhatsApp', hint: 'El texto que aparece al tocar «Escribinos»' },
  { key: 'email', label: 'Email' },
  { key: 'instagram', label: 'Usuario de Instagram', hint: 'Sin @' },
  { key: 'instagramUrl', label: 'Link de Instagram' },
];
const PLACE: { key: keyof BusinessInfo; label: string; hint?: string }[] = [
  { key: 'address', label: 'Dirección' },
  { key: 'crossStreets', label: 'Referencia', hint: 'Ej.: Boulevard y Paseo 111' },
  { key: 'city', label: 'Localidad' },
  { key: 'province', label: 'Provincia' },
  { key: 'postalCode', label: 'Código postal' },
  { key: 'mapsUrl', label: 'Link de Google Maps' },
];

export default function SettingsPage() {
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const { data, isLoading } = useAdminQuery<Settings>(['admin-settings'], '/admin/settings');
  const [b, setB] = useState<BusinessInfo | null>(null);
  useEffect(() => {
    if (data?.business) setB(data.business);
  }, [data]);
  const dirty = useMemo(() => JSON.stringify(b) !== JSON.stringify(data?.business), [b, data]);
  const save = useAdminMutation<BusinessInfo>({ method: 'PUT', path: '/admin/settings/business', body: (v) => ({ value: v }), invalidate: [['admin-settings']], success: 'Datos guardados. Ya se ven en la web.' });

  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const changePw = async () => {
    if (pw.next.length < 8) return toast.error('La nueva contraseña tiene que tener al menos 8 caracteres');
    if (pw.next !== pw.again) return toast.error('Las contraseñas nuevas no coinciden');
    setPwBusy(true);
    try {
      await post('/auth/password', { currentPassword: pw.current, newPassword: pw.next });
      toast.success('Contraseña cambiada');
      setPw({ current: '', next: '', again: '' });
    } catch (e) {
      toast.error(e instanceof HttpError ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setPwBusy(false);
    }
  };

  if (isLoading || !b) return <LoadingBlock />;
  const set = (k: keyof BusinessInfo, v: unknown) => setB((s) => (s ? { ...s, [k]: v } : s));
  const field = (f: { key: keyof BusinessInfo; label: string; hint?: string; area?: boolean }) => (
    <Field key={f.key} label={f.label} hint={f.hint}>
      {f.area ? (
        <Textarea rows={3} value={String(b[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} disabled={!isAdmin} />
      ) : (
        <Input value={String(b[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} disabled={!isAdmin} />
      )}
    </Field>
  );

  return (
    <>
      <PageHeader title="Datos y ajustes" text={isAdmin ? 'Lo que se muestra en la web: contacto, dirección, zona de trabajo y medios de pago.' : 'Sólo un administrador puede cambiar estos datos.'} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <Card title="El negocio">
            <div className="space-y-4">{TEXT.map(field)}</div>
          </Card>
          <Card title="Contacto">
            <div className="space-y-4">{CONTACT.map(field)}</div>
          </Card>
        </div>
        <div className="min-w-0 space-y-5">
          <Card title="Dónde está">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLACE.map(field)}
              <Field label="Latitud" hint="Para el mapa">
                <Input inputMode="decimal" value={b.lat ?? ''} onChange={(e) => set('lat', e.target.value === '' ? undefined : Number(e.target.value))} disabled={!isAdmin} />
              </Field>
              <Field label="Longitud">
                <Input inputMode="decimal" value={b.lng ?? ''} onChange={(e) => set('lng', e.target.value === '' ? undefined : Number(e.target.value))} disabled={!isAdmin} />
              </Field>
            </div>
          </Card>
          <Card title="Zona, envíos y pagos">
            <div className="space-y-4">
              <Field label="Localidades donde trabajan" hint="Una por renglón">
                <LinesInput value={b.serviceArea ?? []} onChange={(v) => set('serviceArea', v)} />
              </Field>
              <Field label="Envíos" hint="Ej.: Calcos y estampados con envío a todo el país">
                <Input value={b.shipping ?? ''} onChange={(e) => set('shipping', e.target.value)} disabled={!isAdmin} />
              </Field>
              <Field label="Medios de pago" hint="Uno por renglón. Si queda vacío, la web no los muestra.">
                <LinesInput value={b.paymentMethods ?? []} onChange={(v) => set('paymentMethods', v)} placeholder={'Efectivo\nTransferencia\nMercado Pago'} />
              </Field>
            </div>
          </Card>
          <Card title="Tu contraseña">
            <div className="space-y-3">
              <Field label="Contraseña actual">
                <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nueva">
                  <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                </Field>
                <Field label="Repetir la nueva">
                  <Input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />
                </Field>
              </div>
              <Btn size="sm" onClick={changePw} disabled={pwBusy || !pw.current || !pw.next}>
                Cambiar contraseña
              </Btn>
            </div>
          </Card>
        </div>
      </div>
      {isAdmin && <SaveBar dirty={dirty} saving={save.isPending} onSave={() => save.mutate(b)} onReset={() => setB(data?.business ?? null)} />}
    </>
  );
}
