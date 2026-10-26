'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Fondo con parallax: el contenido interno se desplaza más lento que el scroll.
 * `strength` = cuánto se mueve (0.15 = 15% de la altura del contenedor hacia cada lado).
 */
export function ParallaxBg({ children, strength = 0.15, className, innerClassName }: { children: ReactNode; strength?: number; className?: string; innerClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-strength * 100}%`, `${strength * 100}%`]);
  const pad = `${-strength * 100}%`;
  return (
    <div ref={ref} className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      <motion.div style={{ y: reduce ? 0 : y, top: pad, bottom: pad }} className={cn('absolute inset-x-0 will-change-transform', innerClassName)}>
        {children}
      </motion.div>
    </div>
  );
}

/** Elemento que flota a otra velocidad que el scroll (positivo = más lento / baja, negativo = sube) */
export function ParallaxItem({ children, offset = 60, className }: { children: ReactNode; offset?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return (
    <motion.div ref={ref} style={{ y: reduce ? 0 : y }} className={cn('will-change-transform', className)}>
      {children}
    </motion.div>
  );
}
