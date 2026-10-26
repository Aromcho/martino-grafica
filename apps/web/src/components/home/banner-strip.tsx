import Link from 'next/link';
import { Img } from '@/components/ui/img';
import type { Banner } from '@/lib/types';

/** Avisos cargados desde el panel (con fecha de inicio y fin) */
export function BannerStrip({ banners, bare }: { banners: Banner[]; bare?: boolean }) {
  if (!banners.length) return null;
  return (
    <section className={bare ? undefined : 'container-x py-16 lg:py-20'} aria-label="Novedades">
      <div className="grid gap-5 lg:grid-cols-2">
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.ctaHref ?? '/cotizar'}
            className="group relative grid min-h-[15rem] overflow-hidden rounded-md bg-graphite ring-1 ring-white/10 sm:grid-cols-[1fr_0.9fr]"
          >
            <div className="relative z-10 flex flex-col justify-between gap-6 p-6 lg:p-8">
              <div>
                <h3 className="display text-[clamp(1.5rem,3.6vw,2.2rem)]">{b.title}</h3>
                {b.subtitle && <p className="mt-3 max-w-sm text-white/70">{b.subtitle}</p>}
              </div>
              <span className="inline-flex w-fit items-center rounded-lg bg-lime px-4 py-2.5 text-sm font-bold text-ink transition-colors group-hover:bg-white">{b.ctaLabel ?? 'Ver más'}</span>
            </div>
            {b.media && <Img media={b.media} sizes="(min-width: 1024px) 22vw, 92vw" className="h-48 sm:h-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
