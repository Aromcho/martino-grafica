'use client';

import { Mail, MapPin } from 'lucide-react';
import { useBusiness } from '@/components/site/business-provider';
import { HoursTable } from '@/components/site/hours-table';
import { MapEmbed } from '@/components/site/map-embed';
import { buttonClass } from '@/components/ui/button';
import { InstagramIcon, WhatsAppIcon } from '@/components/ui/icons';
import { waLink } from '@/lib/format';

export function Visit({ id = 'horarios' }: { id?: string }) {
  const { info } = useBusiness();
  if (!info) return null;
  return (
    <section id={id} className="container-x py-20 lg:py-28" aria-labelledby="visita-title">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <h2 id="visita-title" className="display t-md">
            Pasá por el taller
          </h2>
          <address className="mt-6 not-italic">
            <a href={info.mapsUrl} target="_blank" rel="noopener noreferrer" className="group flex gap-3 text-xl font-bold">
              <MapPin className="mt-1 size-5 shrink-0 text-lime" />
              <span>
                {info.address}
                <span className="block text-base font-normal text-smoke">
                  {info.crossStreets}, {info.city}
                </span>
              </span>
            </a>
          </address>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={waLink(info.whatsapp, info.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className={buttonClass('lime', 'md')}>
              <WhatsAppIcon className="size-5" /> {info.phone}
            </a>
            <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md', 'text-white')}>
              <InstagramIcon className="size-5" /> @{info.instagram}
            </a>
            {info.email && (
              <a href={`mailto:${info.email}`} className={buttonClass('ghost', 'md')}>
                <Mail className="size-5" /> Email
              </a>
            )}
          </div>
          <div className="mt-10 rounded-md bg-graphite p-5 ring-1 ring-white/10 lg:p-6">
            <h3 className="mb-3 text-lg font-bold">Horarios</h3>
            <HoursTable />
          </div>
          {info.serviceArea?.length > 0 && (
            <p className="mt-8 text-smoke">
              Hicimos trabajos en {info.serviceArea.slice(0, -1).join(', ')} y {info.serviceArea[info.serviceArea.length - 1]}.
              {info.shipping ? ` ${info.shipping}` : ''}
            </p>
          )}
          {info.paymentMethods?.length > 0 && <p className="mt-3 text-smoke">Medios de pago: {info.paymentMethods.join(', ')}.</p>}
        </div>
        <MapEmbed lat={info.lat} lng={info.lng} label={`${info.address}, ${info.city}`} />
      </div>
    </section>
  );
}
