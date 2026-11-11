'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { PlotterLogo } from '@/components/brand/plotter-logo';
import { useBusiness } from '@/components/site/business-provider';
import { StatusPill } from '@/components/site/status-pill';
import { buttonClass } from '@/components/ui/button';
import { ScrollFrames, type FrameSeq } from '@/components/home/scroll-frames';

const HERO_SEQ: Record<'wide' | 'tall', FrameSeq> = {
  wide: { dir: '/media/video/seq/hero-d', frames: 120, poster: '/media/video/hero_16x9.webp' },
  tall: { dir: '/media/video/seq/hero-m', frames: 120, poster: '/media/video/hero_9x16.webp' },
};

/** Fondo de la portada: secuencia vertical en el celular, horizontal en pantallas anchas. */
function HeroVideo({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const [seq, setSeq] = useState<FrameSeq | null>(null);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 64rem)');
    const pick = () => setSeq(wide.matches ? HERO_SEQ.wide : HERO_SEQ.tall);
    pick();
    wide.addEventListener('change', pick);
    return () => wide.removeEventListener('change', pick);
  }, []);

  if (!seq) return null;
  return <ScrollFrames key={seq.dir} seq={seq} progress={progress} eager className="absolute inset-0" />;
}

export function Hero({ productsCount }: { productsCount: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { info } = useBusiness();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const logoY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink pt-[calc(var(--header-h)+env(safe-area-inset-top))]" aria-labelledby="hero-title">
      <motion.div className="absolute inset-0 -z-10" style={{ y: reduce ? 0 : videoY }} aria-hidden="true">
        <div className="absolute inset-0 opacity-75 [mask-image:linear-gradient(to_bottom,black_62%,transparent)] lg:opacity-90 lg:[mask-image:none]">
          <HeroVideo progress={scrollYProgress} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_20%,transparent,rgb(0_0_0/0.6)_78%)] lg:bg-[linear-gradient(180deg,rgb(0_0_0/0.15)_0%,transparent_40%,rgb(0_0_0/0.55)_100%)]" />
      </motion.div>

      <div className="container-x flex flex-1 flex-col justify-between gap-10 pb-[calc(var(--tabbar-h)+2.5rem)] pt-8 lg:pb-16 lg:pt-14">
        <motion.div style={{ y: reduce ? 0 : logoY, opacity: reduce ? 1 : fade }} className="w-full max-w-[64rem]">
          <PlotterLogo className="w-full" />
          <p className="display mt-4 flex justify-between text-[clamp(0.62rem,2.6vw,1.6rem)] font-medium tracking-[0.42em] text-white/90 [font-stretch:125%] lg:mt-6" aria-hidden="true">
            {'MARTINO GRAFICA'.split('').map((ch, i) => (
              <span key={i}>{ch === ' ' ? ' ' : ch}</span>
            ))}
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <h1 id="hero-title" className="display t-lg max-w-[15ch] lg:text-[clamp(3.5rem,6vw,5.25rem)]">
              Ploteos, carteles, calcos y estampados
            </h1>
          </div>
          <div className="space-y-6">
            <p className="lede text-white/80">
              Pedí online lo que hacemos en el taller: ploteos, cartelería, estampados, calcos y señalética. Retirás en {info?.city ?? 'Villa Gesell'} o coordinamos el envío.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/tienda" className={buttonClass('lime', 'lg')}>
                {productsCount > 0 ? `Ver ${productsCount.toLocaleString('es-AR')} productos` : 'Ir a la tienda'}
              </Link>
              <Link href="/cotizar" className={buttonClass('outline', 'lg', 'text-white')}>
                Pedir presupuesto
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-smoke">
              <StatusPill />
              {info?.crossStreets && <span>{info.crossStreets}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
