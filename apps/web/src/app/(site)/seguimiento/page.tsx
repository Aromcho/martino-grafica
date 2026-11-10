import type { Metadata } from 'next';
import { TrackingLookup } from '@/components/tracking/lookup';

export const metadata: Metadata = {
  title: 'Seguimiento de pedidos',
  description: 'Ingresá el código de tu pedido para ver en qué está.',
  robots: { index: false, follow: false },
};

export default function TrackingIndexPage() {
  return <TrackingLookup />;
}
