'use client';

import Link from 'next/link';
import { useScroll } from 'motion/react';
import { useRef } from 'react';
import type { Product } from '@/lib/types';
import { ScrollFrames } from '@/components/home/scroll-frames';

const HOLO = { dir: '/media/video/seq/holo', frames: 72, poster: '/media/video/holo.webp' };

/** Llamado a cotizar sobre vinilo holográfico controlado por el scroll */
export function QuoteCta({ products }: { products: Product[] }) {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const quick = products.filter((p) => p.featured).slice(0, 8);
  return (
    <section ref={section} className="relative isolate overflow-hidden py-24 lg:py-32" aria-labelledby="cotizar-cta">
      <ScrollFrames seq={HOLO} progress={scrollYProgress} className="absolute inset-0 -z-10 opacity-75" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/35 to-ink" aria-hidden="true" />
      <div className="container-x">
        <h2 id="cotizar-cta" className="display t-lg max-w-[13ch]">
          ¿Qué querés plotear?
        </h2>
        <p className="lede mt-5 text-white/80">Elegí el trabajo, cargá la medida y la cantidad, subí tu diseño si lo tenés. Te respondemos por WhatsApp.</p>
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {quick.map((p) => (
            <li key={p.id}>
              <Link href={`/cotizar?servicio=${p.slug}`} className="inline-flex h-11 items-center rounded-lg bg-black/55 px-4 text-[0.95rem] font-semibold ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-lime hover:text-ink hover:ring-lime">
                {p.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/cotizar" className="inline-flex h-11 items-center rounded-lg bg-lime px-4 text-[0.95rem] font-bold text-ink hover:bg-white">
              Otro trabajo
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
