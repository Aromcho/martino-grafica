'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/cn';
import type { Highlight } from '@/lib/types';
import { StoryViewer } from './story-viewer';

const SEEN_KEY = 'mg_historias_vistas';

/** Fila de historias destacadas (círculos como en el perfil de Instagram) */
export function HighlightsRow({ highlights, tone = 'dark', className, layout = 'row' }: { highlights: Highlight[]; tone?: 'dark' | 'light'; className?: string; layout?: 'row' | 'grid' }) {
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setSeen(new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')));
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      } catch {
        /* sin almacenamiento */
      }
      return next;
    });
  }, []);

  const list = highlights.filter((h) => h.items.length > 0);
  if (!list.length) return null;

  return (
    <>
      {layout === 'grid' ? (
        <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5', className)} aria-label="Historias destacadas">
          {list.map((h, i) => {
            const isSeen = seen.has(h.id);
            return (
              <li key={h.id}>
                <button type="button" onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-md text-left" aria-label={`Ver historias: ${h.title}`}>
                  <Img media={h.cover ?? h.items[0]?.media} sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 46vw" ratio="9/16" imgClassName="transition-transform duration-700 group-hover:scale-[1.04]" />
                  <span className="absolute inset-x-0 top-0 flex gap-1 p-2.5" aria-hidden="true">
                    {h.items.slice(0, 12).map((it) => (
                      <span key={it.id} className={cn('h-[3px] flex-1 rounded-full', isSeen ? 'bg-white/35' : 'bg-white/80')} />
                    ))}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 pt-14">
                    <span className="flex items-center gap-2">
                      {!isSeen && <span className="size-2 rounded-full bg-lime" aria-hidden="true" />}
                      <span className="text-lg font-extrabold leading-tight text-white [font-stretch:115%]">{h.title}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-white/70">{h.items.length} historias</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className={cn('scroll-x gap-4 pb-1', className)} aria-label="Historias destacadas">
          {list.map((h, i) => {
            const isSeen = seen.has(h.id);
            return (
              <motion.li
                key={h.id}
                className="shrink-0"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <button type="button" onClick={() => setOpen(i)} className="group flex w-[4.6rem] flex-col items-center gap-2 lg:w-20" aria-label={`Ver historias: ${h.title}`}>
                  <span
                    className={cn(
                      'relative grid size-[4.6rem] place-items-center rounded-full p-[2.5px] transition-transform duration-300 ease-out-expo group-active:scale-95 lg:size-[4.8rem]',
                      isSeen ? (tone === 'dark' ? 'bg-white/25' : 'bg-grid') : 'bg-[conic-gradient(from_210deg,#c6f800,#f3ffc2,#c6f800,#7ea000,#c6f800)]',
                    )}
                  >
                    <span className={cn('block size-full overflow-hidden rounded-full p-[2.5px]', tone === 'dark' ? 'bg-ink' : 'bg-liner')}>
                      <Img media={h.cover ?? h.items[0]?.media} sizes="80px" className="size-full rounded-full" imgClassName="transition-transform duration-500 group-hover:scale-110" />
                    </span>
                  </span>
                  <span className={cn('line-clamp-1 max-w-full text-center text-[0.74rem] font-medium', tone === 'dark' ? 'text-white/80' : 'text-slate')}>
                    {h.title}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
      <AnimatePresence>
        {open !== null && <StoryViewer key="viewer" highlights={list} startIndex={open} onClose={() => setOpen(null)} onSeen={markSeen} />}
      </AnimatePresence>
    </>
  );
}
