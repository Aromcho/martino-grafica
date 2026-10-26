'use client';

import { useEffect, useRef, useState } from 'react';

/** Índice de rubros pegado arriba: marca en lima el rubro que se está viendo */
export function CategoryIndex({ items }: { items: { slug: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.slug ?? '');
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.slug)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (window.scrollY < 120) setActive(items[0]?.slug ?? '');
        else if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  // El chip activo se mantiene a la vista en el celular
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    const track = bar.current;
    if (!el || !track) return;
    const left = el.offsetLeft - track.offsetLeft - 16;
    track.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  return (
    <nav className="sticky top-[var(--header-offset,0px)] z-30 border-y border-white/10 bg-ink/92 py-3 backdrop-blur-md transition-[top] duration-300 ease-out-expo" aria-label="Rubros">
      <div className="container-x">
        <div ref={bar} className="scroll-x -mx-4 gap-2 px-4 sm:mx-0 sm:px-0">
          {items.map((i) => (
            <a key={i.slug} href={`#${i.slug}`} data-slug={i.slug} className="chip" data-active={active === i.slug} aria-current={active === i.slug ? 'location' : undefined}>
              {i.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
