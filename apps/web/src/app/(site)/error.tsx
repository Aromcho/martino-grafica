'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonClass } from '@/components/ui/button';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-x grid min-h-[80svh] content-center pb-[calc(var(--tabbar-h)+2rem)] pt-[calc(var(--header-h)+3rem)]">
      <h1 className="display t-md max-w-[16ch]">No pudimos cargar esta página</h1>
      <p className="lede mt-4 text-white/75">Puede ser un corte momentáneo. Probá de nuevo en unos segundos o escribinos por WhatsApp.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClass('lime', 'md')}>
          Reintentar
        </button>
        <Link href="/" className={buttonClass('outline', 'md', 'text-white')}>
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
