import { BannerStrip } from '@/components/home/banner-strip';
import { FeaturedWorks } from '@/components/home/featured-works';
import { Hero } from '@/components/home/hero';
import { Prices } from '@/components/home/prices';
import { Process } from '@/components/home/process';
import { QuoteCta } from '@/components/home/quote-cta';
import { Rubros } from '@/components/home/rubros';
import { FeaturedProducts, HowToBuy, ShopCategories } from '@/components/home/shop';
import { Visit } from '@/components/home/visit';
import { HighlightsRow } from '@/components/stories/highlights-row';
import { getBanners, getCategories, getHighlights, getProducts, getStoreCategories, getStoreProducts, getWorks } from '@/lib/api';

export default async function HomePage() {
  const [categories, works, highlights, products, banners, storeCategories, featured] = await Promise.all([
    getCategories(),
    getWorks({ featured: true, pageSize: 6 }),
    getHighlights(),
    getProducts(),
    getBanners('HOME_STRIP'),
    getStoreCategories(),
    getStoreProducts({ sort: 'relevancia', stock: '1', pageSize: 10 }),
  ]);
  const total = categories.reduce((n, c) => n + c.workCount, 0);
  const storeTotal = storeCategories.reduce((n, c) => n + c.productCount, 0);
  return (
    <>
      <Hero productsCount={storeTotal} />
      <HowToBuy />
      <ShopCategories categories={storeCategories} />
      <FeaturedProducts products={featured.items} />
      <BannerStrip banners={banners} />
      <Prices products={products} />
      {highlights.length > 0 && (
        <section className="border-y border-white/10 py-6" aria-label="Historias destacadas">
          <div className="container-x">
            <HighlightsRow highlights={highlights} />
          </div>
        </section>
      )}
      <FeaturedWorks works={works.items} total={total} />
      <Rubros categories={categories} />
      <Process />
      <QuoteCta products={products} />
      <Visit />
    </>
  );
}
