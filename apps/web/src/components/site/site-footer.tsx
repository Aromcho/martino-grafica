'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { LogoMark } from '@/components/brand/plotter-logo';
import { InstagramIcon, WhatsAppIcon } from '@/components/ui/icons';
import { waLink } from '@/lib/format';
import type { Category } from '@/lib/types';
import { useBusiness } from './business-provider';
import { HoursTable } from './hours-table';

export function SiteFooter({ categories }: { categories: Category[] }) {
  const { info } = useBusiness();
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-white/10 bg-ink pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] pt-14 lg:pb-12">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <LogoMark className="w-40" />
            <p className="mt-5 max-w-xs text-smoke">{info?.tagline ?? 'Ploteos, cartelería, calcos y estampados en Villa Gesell'}</p>
            <div className="mt-6 flex gap-2">
              {info?.whatsapp && (
                <a href={waLink(info.whatsapp, info.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-md bg-white/8 ring-1 ring-white/10 hover:bg-lime hover:text-ink" aria-label="WhatsApp">
                  <WhatsAppIcon className="size-5" />
                </a>
              )}
              {info?.instagramUrl && (
                <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-md bg-white/8 ring-1 ring-white/10 hover:bg-lime hover:text-ink" aria-label="Instagram">
                  <InstagramIcon className="size-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-bold">Rubros</h3>
            <ul className="space-y-2 text-smoke">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/trabajos?rubro=${c.slug}`} className="hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-bold">Contacto</h3>
            <ul className="space-y-3 text-smoke">
              {info?.address && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-lime" />
                  <a href={info.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {info.address}
                    <br />
                    {info.crossStreets ? `${info.crossStreets}, ` : ''}
                    {info.city}
                  </a>
                </li>
              )}
              {info?.phone && (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-lime" />
                  <a href={waLink(info.whatsapp, info.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="tabular hover:text-white">
                    {info.phone}
                  </a>
                </li>
              )}
              {info?.email && (
                <li className="flex gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-lime" />
                  <a href={`mailto:${info.email}`} className="break-all hover:text-white">
                    {info.email}
                  </a>
                </li>
              )}
              {info?.instagram && (
                <li className="flex gap-2.5">
                  <InstagramIcon className="mt-0.5 size-4 shrink-0 text-lime" />
                  <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    @{info.instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div id="horarios-footer">
            <h3 className="mb-4 font-bold">Horarios</h3>
            <HoursTable className="text-white" />
          </div>
        </div>

        <div className="cut-line mt-14 opacity-60" aria-hidden="true" />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-smoke">
          <p>
            © {year} Martino Gráfica. Diseño, impresión y colocación en {info?.city ?? 'Villa Gesell'}.
          </p>
          <nav className="flex gap-4" aria-label="Legales">
            <Link href="/servicios" className="hover:text-white">
              Servicios
            </Link>
            <Link href="/buscar" className="hover:text-white">
              Buscar
            </Link>
            <Link href="/admin" className="hover:text-white">
              Panel
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
