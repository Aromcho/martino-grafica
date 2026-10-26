import type { Metadata } from 'next';
import { HighlightsRow } from '@/components/stories/highlights-row';
import { InstagramIcon } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { getBusiness, getHighlights } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Historias',
  description: 'Las historias destacadas del taller: motos, vehículos, carteles, calcos, estampados, gorras y más, como en el Instagram de Martino Gráfica.',
  alternates: { canonical: '/historias' },
};

export default async function StoriesPage() {
  const [highlights, business] = await Promise.all([getHighlights(), getBusiness()]);
  const total = highlights.reduce((n, h) => n + h.items.length, 0);
  const info = business.info;
  return (
    <>
      <PageHeader
        title="Historias"
        lede={`${total} historias destacadas del taller, agrupadas por rubro. Tocá una para verla; deslizá o tocá los costados para pasar.`}
        aside={
          info?.instagramUrl ? (
            <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold underline-offset-4 hover:text-lime hover:underline">
              <InstagramIcon className="size-5" /> @{info.instagram}
            </a>
          ) : null
        }
      />
      <div className="container-x pb-20 lg:pb-28">
        <HighlightsRow highlights={highlights} layout="grid" />
      </div>
    </>
  );
}
