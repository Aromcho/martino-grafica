'use client';

import Link from 'next/link';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import { bestSrc } from '@/lib/media';
import type { Highlight } from '@/lib/types';

interface Props {
  highlights: Highlight[];
  startIndex: number;
  onClose: () => void;
  onSeen?: (id: string) => void;
}

/**
 * Visor de historias destacadas, como en Instagram:
 * tocar a la derecha avanza, a la izquierda vuelve, mantener pausa,
 * deslizar de costado cambia de destacada y deslizar hacia abajo cierra.
 */
export function StoryViewer({ highlights, startIndex, onClose, onSeen }: Props) {
  const [hi, setHi] = useState(startIndex);
  const [ii, setIi] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const holdRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const draggedRef = useRef(false);

  const group = highlights[hi];
  const item = group?.items[ii];
  const duration = item?.durationMs ?? 5000;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (group) onSeen?.(group.id);
  }, [group, onSeen]);

  const goGroup = useCallback(
    (delta: number) => {
      const next = hi + delta;
      if (next < 0) {
        setIi(0);
        setProgress(0);
        return;
      }
      if (next >= highlights.length) return onClose();
      setDir(delta);
      setHi(next);
      setIi(0);
      setProgress(0);
    },
    [hi, highlights.length, onClose],
  );

  const next = useCallback(() => {
    if (!group) return;
    if (ii < group.items.length - 1) {
      setIi(ii + 1);
      setProgress(0);
    } else goGroup(1);
  }, [group, ii, goGroup]);

  const prev = useCallback(() => {
    if (ii > 0) {
      setIi(ii - 1);
      setProgress(0);
    } else goGroup(-1);
  }, [ii, goGroup]);

  // temporizador
  const progressRef = useRef(0);
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
  }, [hi, ii]);

  useEffect(() => {
    if (paused || !item) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      progressRef.current += (now - last) / duration;
      last = now;
      if (progressRef.current >= 1) {
        next();
        return;
      }
      setProgress(progressRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, item, duration, next]);

  // precarga de la siguiente imagen
  useEffect(() => {
    const nextItem = group?.items[ii + 1] ?? highlights[hi + 1]?.items[0];
    if (nextItem?.media) {
      const img = new Image();
      img.src = bestSrc(nextItem.media, 'lg');
    }
  }, [group, ii, hi, highlights]);

  // teclado + bloqueo de scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    const onVis = () => setPaused(document.hidden);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      document.body.style.overflow = prevOverflow;
    };
  }, [next, prev, onClose]);

  const onPointerDown = () => {
    heldRef.current = false;
    draggedRef.current = false;
    holdRef.current = window.setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 220);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
    if (draggedRef.current) return;
    if (heldRef.current) {
      setPaused(false);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.32) prev();
    else next();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) return onClose();
    if (info.offset.x < -80) goGroup(1);
    else if (info.offset.x > 80) goGroup(-1);
  };

  if (!mounted || !group || !item) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Historias: ${group.title}`}
      data-lenis-prevent
    >
      {/* fondo desenfocado (escritorio) */}
      <div className="absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
        <Img media={item.media} sizes="20vw" className="absolute inset-0 scale-125 opacity-40 blur-3xl" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <button type="button" onClick={() => goGroup(-1)} className="absolute left-[calc(50%-min(28vh,260px)-4.5rem)] hidden size-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 lg:grid" aria-label="Historia anterior">
        <ChevronLeft className="size-6" />
      </button>
      <button type="button" onClick={() => goGroup(1)} className="absolute right-[calc(50%-min(28vh,260px)-4.5rem)] hidden size-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 lg:grid" aria-label="Historia siguiente">
        <ChevronRight className="size-6" />
      </button>

      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={group.id}
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0.4, scale: 0.94 }),
            center: { x: 0, opacity: 1, scale: 1 },
            exit: (d: number) => ({ x: d > 0 ? '-35%' : '35%', opacity: 0, scale: 0.94 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          drag
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.6, left: 0.25, right: 0.25 }}
          onDragStart={() => {
            draggedRef.current = true;
            if (holdRef.current) window.clearTimeout(holdRef.current);
          }}
          onDragEnd={onDragEnd}
          className="relative h-full w-full overflow-hidden bg-graphite lg:h-[min(92vh,940px)] lg:w-auto lg:aspect-[9/16] lg:rounded-xl"
        >
          <AnimatePresence initial={false}>
            <motion.div key={item.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Img media={item.media} sizes="(min-width: 1024px) 540px, 100vw" priority className="absolute inset-0" />
            </motion.div>
          </AnimatePresence>

          {/* zona táctil */}
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => holdRef.current && window.clearTimeout(holdRef.current)}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* barra superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-3 pb-10 pt-[calc(env(safe-area-inset-top)+10px)]">
            <div className="flex gap-1">
              {group.items.map((it, i) => (
                <span key={it.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                  <span className="block h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${i < ii ? 1 : i === ii ? progress : 0})` }} />
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="size-8 overflow-hidden rounded-full ring-2 ring-white/70">
                <Img media={group.cover ?? group.items[0]?.media} sizes="40px" className="size-full" />
              </span>
              <span className="text-sm font-semibold text-white">{group.title}</span>
              <span className="text-xs text-white/60 tabular">
                {ii + 1}/{group.items.length}
              </span>
              <span className="pointer-events-auto ml-auto flex items-center gap-1">
                <button type="button" onClick={() => setPaused((p) => !p)} className="grid size-10 place-items-center rounded-full text-white/90 hover:bg-white/10" aria-label={paused ? 'Reanudar' : 'Pausar'}>
                  {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
                </button>
                <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10" aria-label="Cerrar historias">
                  <X className="size-6" />
                </button>
              </span>
            </div>
          </div>

          {/* pie: texto y enlace al trabajo, servicio o rubro */}
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-16">
            {item.caption && <p className="max-w-md text-[0.95rem] leading-relaxed text-white/95">{item.caption}</p>}
            {(() => {
              const link = item.work
                ? { href: `/trabajos/${item.work.slug}`, label: item.work.title }
                : item.product
                  ? { href: `/servicios/${item.product.slug}`, label: item.product.name }
                  : group.category
                    ? { href: `/trabajos?rubro=${group.category.slug}`, label: `Ver trabajos de ${group.category.name.toLowerCase()}` }
                    : null;
              if (link)
                return (
                  <Link href={link.href} onClick={onClose} className={cn('mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-bold text-ink transition active:scale-[0.98]')}>
                    <span className="truncate">{link.label}</span>
                    <ArrowUpRight className="size-4 shrink-0" />
                  </Link>
                );
              if (item.linkUrl)
                return (
                  <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-ink">
                    Abrir enlace
                  </a>
                );
              return null;
            })()}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
