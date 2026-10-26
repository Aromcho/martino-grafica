'use client';

import { useEffect } from 'react';

/** Scroll suave con Lenis sólo en escritorio con mouse (en móvil se respeta el scroll nativo) */
export function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    let raf = 0;
    let destroyed = false;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    import('lenis').then(({ default: Lenis }) => {
      if (destroyed) return;
      lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.95 });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
  return null;
}
