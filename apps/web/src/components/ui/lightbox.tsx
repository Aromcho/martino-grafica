'use client';

import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Img } from '@/components/ui/img';
import type { Media } from '@/lib/types';

/** Visor de fotos a pantalla completa: deslizar, flechas del teclado, Esc para cerrar */
export function Lightbox({ images, index, onClose, title }: { images: Media[]; index: number | null; onClose: () => void; title?: string }) {
  const [i, setI] = useState(index ?? 0);
  const [dir, setDir] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null;

  useEffect(() => {
    if (index !== null) setI(index);
  }, [index]);

  const go = useCallback(
    (d: number) => {
      setDir(d);
      setI((cur) => (cur + d + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, go, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.y) > 120 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) return onClose();
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  if (typeof document === 'undefined') return null;
  const m = images[i];
  return createPortal(
    <AnimatePresence>
      {open && m && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-black/96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={title ? `Fotos: ${title}` : 'Fotos'}
          data-lenis-prevent
        >
          <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <p className="tabular text-sm font-semibold text-white/80" aria-live="polite">
              {i + 1} / {images.length}
            </p>
            <button ref={closeRef} type="button" onClick={onClose} className="grid size-11 place-items-center rounded-md text-white hover:bg-white/10" aria-label="Cerrar">
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={m.id}
                custom={dir}
                className="absolute inset-0 flex touch-pan-y items-center justify-center px-2 pb-4 sm:px-16"
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                drag
                dragSnapToOrigin
                dragElastic={0.6}
                onDragEnd={onDragEnd}
              >
                <Img media={m} fit="contain" sizes="100vw" className="size-full !bg-transparent" priority />
              </motion.div>
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-md bg-white/10 text-white hover:bg-white/20 sm:grid" aria-label="Foto anterior">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-md bg-white/10 text-white hover:bg-white/20 sm:grid" aria-label="Foto siguiente">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="scroll-x gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-1 sm:justify-center">
              {images.map((im, k) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => {
                    setDir(k > i ? 1 : -1);
                    setI(k);
                  }}
                  className={`size-14 shrink-0 overflow-hidden rounded-[3px] transition-opacity ${k === i ? 'opacity-100 ring-2 ring-lime' : 'opacity-45 hover:opacity-80'}`}
                  aria-label={`Ver foto ${k + 1}`}
                  aria-current={k === i ? 'true' : undefined}
                >
                  <Img media={im} sizes="56px" className="size-full" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
