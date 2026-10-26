'use client';

import { CrudPage } from '@/components/admin/crud';
import { Badge } from '@/components/admin/ui';
import { formatDate } from '@/lib/format';
import type { Media } from '@/lib/types';

const PLACES = [
  { value: 'HOME_STRIP', label: 'Inicio, franja de novedades' },
  { value: 'SERVICES', label: 'Página de servicios' },
  { value: 'HOME_HERO', label: 'Inicio, arriba (reservado)' },
];

function state(r: Record<string, unknown>) {
  if (r.active === false) return <Badge tone="red">Apagado</Badge>;
  const now = Date.now();
  if (r.startsAt && new Date(String(r.startsAt)).getTime() > now) return <Badge tone="warn">Programado</Badge>;
  if (r.endsAt && new Date(String(r.endsAt)).getTime() < now) return <Badge>Vencido</Badge>;
  return <Badge tone="lime">En la web</Badge>;
}

export default function BannersPage() {
  return (
    <CrudPage
      title="Banners"
      text="Avisos y promos con foto, botón y fechas de inicio y fin: se prenden y apagan solos."
      queryKey="admin-banners"
      listPath="/admin/banners"
      basePath="/admin/banners"
      reorderPath="/admin/banners/order"
      newLabel="Nuevo banner"
      defaults={{ placement: 'HOME_STRIP' }}
      rowTitle={(r) => String(r.title)}
      rowSubtitle={(r) =>
        [PLACES.find((p) => p.value === r.placement)?.label, r.endsAt ? `hasta ${formatDate(String(r.endsAt), { day: 'numeric', month: 'short', year: 'numeric' })}` : null].filter(Boolean).join(' · ')
      }
      rowImage={(r) => r.media as Media | null}
      rowBadges={state}
      fields={[
        { key: 'title', label: 'Título', type: 'text', required: true, placeholder: '20% off en remeras' },
        { key: 'subtitle', label: 'Texto', type: 'textarea' },
        { key: 'ctaLabel', label: 'Texto del botón', type: 'text', placeholder: 'Pedir presupuesto' },
        { key: 'ctaHref', label: 'Link del botón', type: 'text', placeholder: '/cotizar?servicio=remera-estampada', hint: 'Una página de la web (/servicios/…) o un link completo' },
        { key: 'placement', label: 'Dónde se muestra', type: 'select', options: PLACES },
        { key: 'mediaId', label: 'Foto', type: 'image', mediaKey: 'media' },
        { key: 'startsAt', label: 'Desde', type: 'datetime', hint: 'Vacío: desde ya' },
        { key: 'endsAt', label: 'Hasta', type: 'datetime', hint: 'Vacío: sin vencimiento' },
        { key: 'active', label: 'Encendido', type: 'switch' },
      ]}
    />
  );
}
