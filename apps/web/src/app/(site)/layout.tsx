import type { ReactNode } from 'react';
import { JsonLd } from '@/components/seo/json-ld';
import { BusinessProvider } from '@/components/site/business-provider';
import { CartDrawer, CartProvider } from '@/components/store/cart';
import { FloatingWhatsApp } from '@/components/site/floating-whatsapp';
import { Providers } from '@/components/site/providers';
import { SearchOverlay } from '@/components/site/search-overlay';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { SmoothScroll } from '@/components/site/smooth-scroll';
import { TabBar } from '@/components/site/tab-bar';
import { UIProvider } from '@/components/site/ui-provider';
import { getBusiness, getCategories } from '@/lib/api';
import { localBusinessLd } from '@/lib/seo';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [business, categories] = await Promise.all([getBusiness(), getCategories()]);
  const ld = localBusinessLd(business.info, business.hours);
  return (
    <Providers>
      <UIProvider>
        <BusinessProvider initial={business}>
          <CartProvider>
            <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-md focus:bg-lime focus:px-4 focus:py-2 focus:font-bold focus:text-ink">
              Saltar al contenido
            </a>
            <SmoothScroll />
            <SiteHeader />
            <main id="contenido" className="min-h-svh">
              {children}
            </main>
            <SiteFooter categories={categories} />
            <TabBar />
            <FloatingWhatsApp />
            <SearchOverlay />
            <CartDrawer />
            {ld && <JsonLd data={ld} />}
          </CartProvider>
        </BusinessProvider>
      </UIProvider>
    </Providers>
  );
}
