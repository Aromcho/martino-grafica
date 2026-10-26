import type { Metadata } from 'next';
import { QuoteBuilder } from '@/components/quote/quote-builder';
import { PageHeader } from '@/components/ui/page-header';
import { getBusiness, getCategories, getProducts, getWork } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Pedir presupuesto',
  description: 'Armá tu pedido en un minuto: elegí el trabajo, cargá la medida y la cantidad, subí tu diseño y seguí por WhatsApp con Martino Gráfica.',
  alternates: { canonical: '/cotizar' },
};

type SP = Promise<{ servicio?: string; cantidad?: string; trabajo?: string }>;

export default async function QuotePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [products, categories, business, work] = await Promise.all([
    getProducts(),
    getCategories(),
    getBusiness(),
    sp.trabajo ? getWork(sp.trabajo).catch(() => null) : Promise.resolve(null),
  ]);
  const cantidad = Number(sp.cantidad);
  return (
    <>
      <PageHeader title="Pedí tu presupuesto" lede="Cinco pasos cortos. Te respondemos por WhatsApp con el precio y los tiempos." />
      <section className="liner pb-[calc(var(--tabbar-h)+3rem)] pt-8 lg:pb-24 lg:pt-12" style={{ ['--cm' as string]: '24px' }}>
        <div className="container-x">
          <QuoteBuilder
            products={products}
            categories={categories}
            whatsapp={business.info?.whatsapp}
            initial={{
              servicio: sp.servicio,
              cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.round(cantidad) : undefined,
              message: work ? `Quiero algo parecido al trabajo "${work.title}".` : undefined,
            }}
          />
        </div>
      </section>
    </>
  );
}
