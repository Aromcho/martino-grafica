'use client';

import { MapPin } from 'lucide-react';
import { useState } from 'react';

/** Mapa de Google que se carga cuando la persona lo pide (no pesa al abrir la página) */
export function MapEmbed({ lat, lng, label }: { lat?: number; lng?: number; label: string }) {
  const [show, setShow] = useState(false);
  const q = lat && lng ? `${lat},${lng}` : encodeURIComponent(label);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-liner text-ink lg:aspect-auto lg:h-full lg:min-h-[24rem]">
      {show ? (
        <iframe title={`Mapa: ${label}`} src={`https://www.google.com/maps?q=${q}&z=16&output=embed`} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" onClick={() => setShow(true)} className="liner group absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ ['--cm' as string]: '18px' }}>
          <span className="relative grid size-16 place-items-center rounded-full bg-ink text-lime transition-transform group-hover:scale-105">
            <span className="absolute -inset-2 rounded-full border-2 border-dashed border-cut/70 motion-safe:animate-[spin_9s_linear_infinite]" />
            <MapPin className="relative size-7" />
          </span>
          <span className="text-lg font-bold">Ver el mapa</span>
          <span className="text-sm text-slate">{label}</span>
        </button>
      )}
    </div>
  );
}
