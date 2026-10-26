'use client';

import { Expand } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Img } from '@/components/ui/img';
import { Lightbox } from '@/components/ui/lightbox';
import { cn } from '@/lib/cn';
import type { Media } from '@/lib/types';

/**
 * Fotos del trabajo. En el celular: carrusel a todo el ancho que se desliza con el dedo, con contador.
 * En escritorio: la primera grande y el resto en dos columnas. Tocar una abre el visor.
 */
export function WorkGallery({ images, title }: { images: Media[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const track = useRef<HTMLUListElement>(null);

  // Foto actual del carrusel según el desplazamiento horizontal
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const items = Array.from(el.children) as HTMLElement[];
      const left = el.scrollLeft;
      let best = 0;
      let dist = Infinity;
      items.forEach((it, k) => {
        const d = Math.abs(it.offsetLeft - el.offsetLeft - left - 16);
        if (d < dist) {
          dist = d;
          best = k;
        }
      });
      setCurrent(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [images.length]);

  if (!images.length) return null;
  const single = images.length === 1;

  return (
    <>
      <div className="relative">
        <ul
          ref={track}
          className={cn('scroll-x scroll-px-4 gap-3 px-4 sm:scroll-px-6 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0', single && 'lg:grid-cols-1')}
          aria-label={`Fotos de ${title}`}
        >
          {images.map((m, i) => {
            const r = m.width && m.height ? m.width / m.height : 0.8;
            return (
              <li
                key={m.id}
                data-i={i}
                className={cn('shrink-0', single ? 'w-full' : 'w-[86%] sm:w-[62%] lg:w-auto', i === 0 && 'lg:col-span-2')}
                style={{ '--r': Math.max(0.75, Math.min(r, 1.9)) } as CSSProperties}
              >
                <button type="button" onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-[3px]" aria-label={`Ampliar foto ${i + 1} de ${images.length}`}>
                  <Img
                    media={m}
                    alt={m.alt ?? `${title}, foto ${i + 1}`}
                    sizes={i === 0 ? '(min-width: 1024px) 60vw, 86vw' : '(min-width: 1024px) 30vw, 86vw'}
                    priority={i < 2}
                    className={cn('w-full', i === 0 ? 'aspect-[4/5] lg:aspect-[var(--r)]' : 'aspect-[4/5]')}
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                    <Expand className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!single && (
          <div className="mt-4 flex items-center justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {images.map((m, i) => (
              <span key={m.id} className={cn('h-1 rounded-full transition-all duration-300', i === current ? 'w-6 bg-lime' : 'w-1.5 bg-white/30')} />
            ))}
          </div>
        )}
      </div>
      <Lightbox images={images} index={open} onClose={() => setOpen(null)} title={title} />
    </>
  );
}

/** Suma una visita al trabajo o servicio (una vez por sesión) para el ranking del panel */
export function ViewPing({ path }: { path: string }) {
  useEffect(() => {
    const key = `mg-view:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* sin storage: se cuenta igual */
    }
    fetch(`/api${path}`, { headers: { accept: 'application/json' } }).catch(() => {});
  }, [path]);
  return null;
}
