import type { Metadata } from 'next';
import { StoreExplorer, type StoreFilters } from '@/components/store/store-explorer';
import { PageHeader } from '@/components/ui/page-header';
import { getStoreCategories, getStoreProducts } from '@/lib/api';
import type { StoreSort } from '@/lib/types';

type SP = Promise<{ categoria?: string; sub?: string; q?: string; orden?: string; stock?: string }>;
const SORTS: StoreSort[] = ['relevancia', 'precio-asc', 'precio-desc', 'nombre', 'nuevos'];

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { categoria } = await searchParams;
  const cats = await getStoreCategories();
  const cat = cats.find((c) => c.slug === categoria);
  const title = cat ? `${cat.name} · Tienda` : 'Tienda: vinilos, lonas e insumos de gráfica';
  return {
    title,
    description: cat
      ? `${cat.name}: ${cat.tagline ?? ''} Comprá online en Martino Gráfica y coordiná retiro o envío por WhatsApp.`
      : 'Vinilos de corte e impresión, termofilm, lonas, placas, sublimación, tintas y herramientas. Armá tu pedido online y coordinamos por WhatsApp. Villa Gesell.',
    alternates: { canonical: cat ? `/tienda?categoria=${cat.slug}` : '/tienda' },
  };
}

export default async function StorePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters: StoreFilters = {
    categoria: sp.categoria ?? '',
    sub: sp.sub ?? '',
    q: sp.q ?? '',
    orden: SORTS.includes(sp.orden as StoreSort) ? (sp.orden as StoreSort) : 'relevancia',
    stock: sp.stock === '1',
  };
  const [categories, initial] = await Promise.all([
    getStoreCategories(),
    getStoreProducts({ category: filters.categoria || undefined, sub: filters.sub || undefined, q: filters.q || undefined, sort: filters.orden, stock: filters.stock ? '1' : undefined, page: 1, pageSize: 24 }),
  ]);
  const total = categories.reduce((n, c) => n + c.productCount, 0);
  return (
    <>
      <PageHeader
        title="Tienda"
        lede={`${total > 0 ? `${total.toLocaleString('es-AR')} productos` : 'Insumos'} para gráfica, cartelería y estampado: vinilos, termofilm, lonas, placas, sublimación y herramientas. Armá el pedido acá y lo confirmamos por WhatsApp.`}
      />
      <StoreExplorer categories={categories} initial={initial} initialFilters={filters} />
    </>
  );
}
