'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { PlotterLogo } from '@/components/brand/plotter-logo';
import { useBusiness } from '@/components/site/business-provider';
import { StatusPill } from '@/components/site/status-pill';
import { buttonClass } from '@/components/ui/button';
import { useScrollVideo } from '@/components/home/scroll-video';

/** Video de fondo: vertical en el celular, horizontal en pantallas anchas. */
function HeroVideo({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [src, setSrc] = useState<{ video: string; poster: string } | null>(null);
  useScrollVideo(ref, progress, reduce);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 64rem)');
    const pick = () => setSrc(wide.matches ? { video: '/media/video/hero_16x9.mp4', poster: '/media/video/hero_16x9.webp' } : { video: '/media/video/hero_9x16.mp4', poster: '/media/video/hero_9x16.webp' });
    pick();
    wide.addEventListener('change', pick);
    return () => wide.removeEventListener('change', pick);
  }, []);

  if (!src) return null;
  return (
    <video
      ref={ref}
      key={src.video}
      className="absolute inset-0 size-full object-cover"
      src={reduce ? undefined : src.video}
      poster={src.poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
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
        <div className="absolute inset-0 opacity-[0.42] [mask-image:linear-gradient(to_bottom,black_45%,transparent)] lg:opacity-70 lg:[mask-image:none]">
          <HeroVideo progress={scrollYProgress} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_20%,transparent,rgb(0_0_0/0.85)_70%)] lg:bg-[linear-gradient(180deg,rgb(0_0_0/0.2)_0%,transparent_38%,rgb(0_0_0/0.72)_100%)]" />
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
              Vinilos, lonas e insumos de gráfica
            </h1>
          </div>
          <div className="space-y-6">
            <p className="lede text-white/80">
              Comprá online lo que usamos en el taller: vinilos de corte e impresión, termofilm, lonas, placas, sublimación y herramientas. Retirás en {info?.city ?? 'Villa Gesell'} o coordinamos el envío.
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
