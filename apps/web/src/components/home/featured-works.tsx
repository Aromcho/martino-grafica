import Link from 'next/link';
import { WorkCard } from '@/components/works/work-card';
import { buttonClass } from '@/components/ui/button';
import type { WorkCard as Work } from '@/lib/types';

export function FeaturedWorks({ works, total }: { works: Work[]; total: number }) {
  if (!works.length) return null;
  const [first, ...rest] = works;
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="trabajos-title">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <h2 id="trabajos-title" className="display t-md max-w-[14ch]">
          Trabajos recientes
        </h2>
        <Link href="/trabajos" className={buttonClass('outline', 'md', 'text-white')}>
          Ver los {total} trabajos
        </Link>
      </div>
      <div className="grid gap-x-8 gap-y-14 px-[14px] sm:grid-cols-2 lg:grid-cols-12">
        <WorkCard work={first} className="sm:col-span-2 lg:col-span-7 lg:row-span-2" ratio="4/5" sizes="(min-width: 1024px) 55vw, 92vw" />
        {rest.slice(0, 2).map((w) => (
          <WorkCard key={w.id} work={w} className="lg:col-span-5" ratio="5/4" sizes="(min-width: 1024px) 38vw, 45vw" />
        ))}
        {rest.slice(2, 5).map((w) => (
          <WorkCard key={w.id} work={w} className="lg:col-span-4" />
        ))}
      </div>
    </section>
  );
}
