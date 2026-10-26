import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/site/providers';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel · Martino Gráfica' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'light' };

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-svh bg-liner text-ink [color-scheme:light]">{children}</div>
    </Providers>
  );
}
