'use client';

import { activeBadge, CrudPage } from '@/components/admin/crud';
import { Badge } from '@/components/admin/ui';
import type { Media } from '@/lib/types';

export default function CategoriesPage() {
  return (
    <CrudPage
      title="Rubros"
      text="Agrupan los servicios y los trabajos (Ploteo vehicular, Cartelería…). El orden es el de la web."
      queryKey="admin-categories"
      listPath="/admin/categories"
      basePath="/admin/categories"
      reorderPath="/admin/categories/order"
      newLabel="Nuevo rubro"
      rowTitle={(r) => String(r.name)}
      rowSubtitle={(r) => `${r.workCount ?? 0} trabajos, ${r.productCount ?? 0} servicios${r.tagline ? ` · ${r.tagline}` : ''}`}
      rowImage={(r) => r.cover as Media | null}
      rowBadges={(r) => (
        <>
          {r.featured ? <Badge tone="lime">Destacado</Badge> : null}
          {activeBadge(r)}
        </>
      )}
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ploteo vehicular' },
        { key: 'shortName', label: 'Nombre corto', type: 'text', hint: 'Para filtros y botones (ej. «Vehículos»)' },
        { key: 'tagline', label: 'Bajada', type: 'text', hint: 'Una línea que se ve en la lista de rubros' },
        { key: 'description', label: 'Descripción', type: 'textarea' },
        { key: 'materials', label: 'Materiales', type: 'lines', placeholder: 'Vinilo de corte\nVinilo impreso' },
        { key: 'coverId', label: 'Foto de portada', type: 'image', mediaKey: 'cover' },
        { key: 'featured', label: 'Destacado', type: 'switch', default: false },
        { key: 'active', label: 'Visible en la web', type: 'switch' },
      ]}
    />
  );
}
