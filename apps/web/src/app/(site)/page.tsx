import { BannerStrip } from '@/components/home/banner-strip';
import { FeaturedWorks } from '@/components/home/featured-works';
import { Hero } from '@/components/home/hero';
import { Prices } from '@/components/home/prices';
import { Process } from '@/components/home/process';
import { QuoteCta } from '@/components/home/quote-cta';
import { Rubros } from '@/components/home/rubros';
import { Visit } from '@/components/home/visit';
import { HighlightsRow } from '@/components/stories/highlights-row';
import { getBanners, getCategories, getHighlights, getProducts, getWorks } from '@/lib/api';

export default async function HomePage() {
  const [categories, works, highlights, products, banners] = await Promise.all([
    getCategories(),
    getWorks({ featured: true, pageSize: 6 }),
    getHighlights(),
    getProducts(),
    getBanners('HOME_STRIP'),
  ]);
  const total = categories.reduce((n, c) => n + c.workCount, 0);
  return (
    <>
      <Hero worksCount={total} />
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
      <Prices products={products} />
      <BannerStrip banners={banners} />
      <QuoteCta products={products} />
      <Visit />
    </>
  );
}
