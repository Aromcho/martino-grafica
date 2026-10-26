'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { num } from '@/lib/format';

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];

/**
 * Vista previa a escala sobre el liner: la pieza se dibuja en lima con su línea de corte magenta
 * y las cotas, sobre la grilla del papel soporte. Si subiste una imagen, se ve adentro.
 */
export function SizePreview({ width, height, image, label }: { width: number; height: number; image?: string | null; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [size, setSize] = useState({ w: 320, h: 240 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const valid = width > 0 && height > 0;
  const w = valid ? width : 100;
  const h = valid ? height : 60;
  const pad = 46;
  const scale = Math.min((size.w - pad * 2) / w, (size.h - pad * 2) / h);
  const pw = Math.max(18, w * scale);
  const ph = Math.max(18, h * scale);
  // Cada cuadro de la grilla representa una medida "redonda" para que se lea la escala
  const step = STEPS.find((s) => (Math.max(w, h) / s) <= 14) ?? 1000;
  const cmPx = Math.max(6, step * scale);
  const area = (w * h) / 10000;

  return (
    <figure className="m-0">
      <div
        ref={box}
        className="liner relative aspect-[4/3] w-full overflow-hidden rounded-md sm:aspect-[16/10]"
        style={{ ['--cm' as string]: `${cmPx / 5}px`, backgroundPosition: 'center' }}
        role="img"
        aria-label={valid ? `Vista previa: ${num(width)} por ${num(height)} centímetros` : 'Cargá la medida para ver la vista previa'}
      >
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            className="relative"
            animate={{ width: pw, height: ph }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
          >
            {/* Línea de corte (CutContour) */}
            <span className="absolute -inset-[5px] rounded-[3px] border-2 border-dashed border-cut" aria-hidden="true" />
            <div className="absolute inset-0 overflow-hidden rounded-[2px] bg-lime shadow-[0_14px_30px_-16px_rgb(0_0_0/0.55)]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="size-full object-contain" />
              ) : (
                <span className="grid size-full place-items-center px-2 text-center text-[0.72rem] font-bold leading-tight text-ink/70">{label}</span>
              )}
            </div>
            {/* Cotas */}
            <span className="tabular absolute -top-8 left-0 right-0 flex items-center justify-center gap-1 text-[0.78rem] font-bold text-ink" aria-hidden="true">
              <span className="h-px flex-1 bg-ink/40" />
              {valid ? `${num(width)} cm` : 'ancho'}
              <span className="h-px flex-1 bg-ink/40" />
            </span>
            <span className="tabular absolute -left-8 bottom-0 top-0 flex w-6 flex-col items-center justify-center gap-1 text-[0.78rem] font-bold text-ink" aria-hidden="true">
              <span className="w-px flex-1 bg-ink/40" />
              <span className="-rotate-90 whitespace-nowrap">{valid ? `${num(height)} cm` : 'alto'}</span>
              <span className="w-px flex-1 bg-ink/40" />
            </span>
          </motion.div>
        </div>
      </div>
      <figcaption className="mt-2 flex justify-between gap-4 text-sm text-smoke">
        <span>{valid ? `${num(Math.round(area * 100) / 100)} m²` : 'Cargá ancho y alto'}</span>
        <span>Cada cuadro grande: {step >= 100 ? `${num(step / 100)} m` : `${step} cm`}</span>
      </figcaption>
    </figure>
  );
}
