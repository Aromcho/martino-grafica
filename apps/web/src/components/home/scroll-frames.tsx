'use client';

import { useReducedMotion, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export type FrameSeq = { dir: string; frames: number; poster: string };

const frameUrl = (dir: string, i: number) => `${dir}/${String(i + 1).padStart(3, '0')}.webp`;

/** Orden de carga: extremos y después cada 16, 8, 4, 2 y 1 cuadros (el scroll funciona enseguida y se va afinando) */
function loadOrder(n: number) {
  const seen = new Set<number>([0, n - 1]);
  const out = [0, n - 1];
  for (const step of [16, 8, 4, 2, 1])
    for (let i = 0; i < n; i += step)
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
  return out;
}

/**
 * Fondo controlado por el scroll: secuencia de cuadros WebP dibujada en un canvas.
 * Reemplaza al <video> con currentTime, que se entrecorta porque cada salto
 * obliga a decodificar desde el último keyframe.
 */
export function ScrollFrames({
  seq,
  progress,
  className,
  focusX = 0.5,
  focusY = 0.5,
  eager = false,
}: {
  seq: FrameSeq;
  progress: MotionValue<number>;
  className?: string;
  /** punto que queda a la vista cuando el cuadro se recorta (0 = izquierda/arriba, 1 = derecha/abajo) */
  focusX?: number;
  focusY?: number;
  /** cargar apenas monta (portada); si no, empieza cuando la sección se acerca a la pantalla */
  eager?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || reduce) return;
    const N = seq.frames;
    const imgs: (HTMLImageElement | null)[] = Array(N).fill(null);
    let alive = true;
    let raf = 0;
    let started = false;

    const nearest = (i: number, step: 1 | -1) => {
      for (let k = i; k >= 0 && k < N; k += step) if (imgs[k]) return k;
      return -1;
    };
    const cover = (img: HTMLImageElement, alpha: number) => {
      const W = cv.width;
      const H = cv.height;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      // el canvas reinicia el suavizado al cambiar de tamaño: sin esto Chrome escala en baja calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (W - w) * focusX, (H - h) * focusY, w, h);
    };
    const draw = () => {
      raf = 0;
      if (!cv.width || !cv.height) return;
      const f = Math.max(0, Math.min(progress.get(), 1)) * (N - 1);
      const a = nearest(Math.floor(f), -1);
      const b = nearest(Math.ceil(f), 1);
      if (a < 0 && b < 0) return;
      cover(imgs[a < 0 ? b : a]!, 1);
      // fundido entre cuadros vecinos para que el scroll se sienta continuo
      if (a >= 0 && b > a) {
        const t = (f - a) / (b - a);
        if (t > 0.01) cover(imgs[b]!, t);
      }
      ctx.globalAlpha = 1;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      schedule();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const unsub = progress.on('change', schedule);

    const queue = loadOrder(N);
    let loaded = 0;
    const next = () => {
      const i = queue.shift();
      if (i === undefined || !alive) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = frameUrl(seq.dir, i);
      // decode() antes de usarlo: así drawImage no decodifica en pleno scroll
      img
        .decode()
        .then(() => {
          if (!alive) return;
          imgs[i] = img;
          loaded++;
          if (loaded === 2) setReady(true);
          schedule();
        })
        .catch(() => {})
        .finally(next);
    };
    const start = () => {
      if (started) return;
      started = true;
      for (let k = 0; k < 4; k++) next();
    };

    let io: IntersectionObserver | null = null;
    if (eager) start();
    else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            io?.disconnect();
          }
        },
        { rootMargin: '900px 0px' },
      );
      io.observe(cv);
    }

    return () => {
      alive = false;
      ro.disconnect();
      io?.disconnect();
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [seq.dir, seq.frames, progress, reduce, focusX, focusY]);

  return (
    <div className={cn('pointer-events-none', className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={seq.poster}
        alt=""
        className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', ready && 'opacity-0')}
        style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
      />
      <canvas ref={canvas} className={cn('absolute inset-0 size-full transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')} />
    </div>
  );
}
