'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useScrollVideo } from '@/components/home/scroll-video';

const STEPS = [
  {
    title: 'Diseño',
    text: 'Traés tu logo o lo creamos con vos. Si querés plotear un vehículo, mandanos una foto y te mostramos cómo quedaría antes de empezar.',
    video: '/media/video/peel.mp4',
    poster: '/media/video/peel.webp',
  },
  {
    title: 'Impresión y corte',
    text: 'Imprimimos en gran formato y cortamos en el plotter: vinilo impreso, de corte, laminado, laqueado, holográfico o tornasolado.',
    video: '/media/video/printer.mp4',
    poster: '/media/video/printer.webp',
  },
  {
    title: 'Colocación',
    text: 'Lo colocamos nosotros: en el taller o en tu local, vidriera o vehículo. Muchos trabajos de motos y calcos salen en el día.',
    video: '/media/video/squeegee.mp4',
    poster: '/media/video/squeegee.webp',
  },
];

function StepVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-9%', '9%']);
  useScrollVideo(ref, scrollYProgress, reduce);
  return (
    <div ref={box} className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-graphite">
      <motion.video
        ref={ref}
        style={{ y: reduce ? 0 : y }}
        className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover"
        src={reduce ? undefined : src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    </div>
  );
}

/** Proceso real del taller: es una secuencia, por eso va numerado */
export function Process() {
  return (
    <section className="bg-graphite py-20 lg:py-28" aria-labelledby="proceso-title">
      <div className="container-x">
        <div className="mb-12 max-w-3xl lg:mb-16">
          <h2 id="proceso-title" className="display t-md">
            Diseño, impresión y colocación
          </h2>
          <p className="lede mt-4 text-white/70">Todo pasa en el mismo taller, sin intermediarios.</p>
        </div>
        <ol className="grid gap-12 lg:grid-cols-3 lg:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <StepVideo src={s.video} poster={s.poster} />
              <div className="mt-6 flex items-baseline gap-4">
                <span className="display tabular text-[2.6rem] text-lime" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-white/70">{s.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
