import type { Metadata } from 'next';
import { TrackingLookup } from '@/components/tracking/lookup';
import { TrackingView } from '@/components/tracking/tracking-view';
import { getTracking } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Seguimiento de tu pedido',
  description: 'Mirá en qué está tu pedido en Martino Gráfica.',
  robots: { index: false, follow: false },
};

export default async function TrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const tracking = await getTracking(code);
  if (!tracking) return <TrackingLookup missing={code} />;
  return <TrackingView t={tracking} />;
}
