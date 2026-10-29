import type { Metadata } from 'next';
import { Checkout } from '@/components/store/checkout';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'Tu carrito',
  description: 'Revisá tu pedido y mandalo al taller: confirmamos stock, precio, pago y entrega por WhatsApp.',
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <PageHeader title="Tu pedido" back={{ href: '/tienda', label: 'Seguir comprando' }} />
      <Checkout />
    </>
  );
}
