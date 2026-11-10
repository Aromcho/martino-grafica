'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useBusiness } from '@/components/site/business-provider';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { waLink } from '@/lib/format';

/** Buscador por código: para quien entra sin el link o con uno mal copiado */
export function TrackingLookup({ missing }: { missing?: string }) {
  const router = useRouter();
  const { info } = useBusiness();
  const [code, setCode] = useState('');
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  return (
    <section className="container-x grid min-h-[80svh] content-center pb-[calc(var(--tabbar-h)+2rem)] pt-[calc(var(--header-h)+3rem)]">
      <div className="liner relative max-w-2xl overflow-hidden rounded-md p-7 sm:p-12" style={{ ['--cm' as string]: '20px' }}>
        <span className="absolute inset-4 rounded border-2 border-dashed border-cut" aria-hidden="true" />
        <p className="relative text-sm font-bold text-slate">Seguimiento de pedidos</p>
        <h1 className="display relative mt-3 text-[clamp(2rem,7vw,3.5rem)]">{missing ? 'No encontramos ese pedido' : '¿En qué está tu pedido?'}</h1>
        <p className="relative mt-4 max-w-md text-slate">
          {missing ? 'Puede que el link esté incompleto. Probá escribir el código que te pasamos, o consultanos por WhatsApp.' : 'Escribí el código que te pasamos al hacer el pedido.'}
        </p>
        <form
          className="relative mt-7 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length >= 6) router.push(`/seguimiento/${clean}`);
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Código del pedido</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej.: HXZ9Z2S8"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={14}
              className="tabular h-12 w-full rounded-lg bg-white px-4 text-lg font-bold uppercase tracking-[0.12em] text-ink outline-none ring-1 ring-black/20 placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate/50 focus:ring-2 focus:ring-ink"
            />
          </label>
          <button type="submit" disabled={clean.length < 6} className={buttonClass('ink', 'md')}>
            Ver <ArrowRight className="size-4" />
          </button>
        </form>
        {info?.whatsapp && (
          <a href={waLink(info.whatsapp, 'Hola Martino Gráfica 👋 Quería consultar por mi pedido.')} target="_blank" rel="noopener noreferrer" className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-ink underline-offset-4 hover:underline">
            <WhatsAppIcon className="size-4" /> Consultar por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
