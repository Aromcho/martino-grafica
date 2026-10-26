import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { archivo } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · Ploteos, cartelería y estampados en Villa Gesell`, template: `%s · ${SITE_NAME}` },
  description:
    'Taller de diseño gráfico en Villa Gesell: ploteo vehicular y de motos, carteles luminosos y corpóreas, vidrieras y esmerilados, calcos y stickers, remeras y gorras estampadas. Diseño, impresión y colocación.',
  applicationName: SITE_NAME,
  keywords: ['ploteo vehicular', 'cartelería', 'calcos', 'stickers', 'remeras estampadas', 'gorras trucker', 'vinilo', 'esmerilado', 'Villa Gesell', 'Mar Azul', 'Mar de las Pampas', 'Pinamar', 'neón LED', 'letras corpóreas'],
  openGraph: { type: 'website', locale: 'es_AR', siteName: SITE_NAME, url: SITE_URL },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={archivo.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
