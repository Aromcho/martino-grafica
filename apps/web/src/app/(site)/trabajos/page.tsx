import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { WorksExplorer } from '@/components/works/works-explorer';
import { getWorkFacets, getWorks } from '@/lib/api';

type SP = Promise<{ rubro?: string; zona?: string; q?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { rubro } = await searchParams;
  const facets = await getWorkFacets();
  const cat = facets.categories.find((c) => c.slug === rubro);
  const title = cat ? `Trabajos de ${cat.name.toLowerCase()}` : 'Trabajos';
  return {
    title,
    description: cat
      ? `${cat.n} trabajos reales de ${cat.name.toLowerCase()} hechos por Martino Gráfica en Villa Gesell y la zona.`
      : 'Portfolio de Martino Gráfica: ploteo de vehículos y motos, carteles, vidrieras, calcos, remeras y gorras. Fotos reales de cada trabajo.',
    alternates: { canonical: cat ? `/trabajos?rubro=${cat.slug}` : '/trabajos' },
  };
}

export default async function WorksPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = { rubro: sp.rubro ?? '', zona: sp.zona ?? '', q: sp.q ?? '' };
  const [facets, initial] = await Promise.all([
    getWorkFacets(),
    getWorks({ category: filters.rubro || undefined, location: filters.zona || undefined, q: filters.q || undefined, page: 1, pageSize: 24 }),
  ]);
  const all = facets.categories.reduce((n, c) => n + c.n, 0);
  const since = facets.years.length ? Math.min(...facets.years.map((y) => y.year)) : null;
  return (
    <>
      <PageHeader
        title="Trabajos"
        lede={`${all} trabajos con fotos reales${since ? ` desde ${since}` : ''}: vehículos, motos, carteles, vidrieras, calcos y textiles. Filtrá por rubro o por zona.`}
      />
      <WorksExplorer facets={facets} initial={initial} initialFilters={filters} />
    </>
  );
}
