'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppIcon } from '@/components/ui/icons';
import { waLink } from '@/lib/format';
import { useBusiness } from './business-provider';

/** Botón flotante de WhatsApp (escritorio). En el celular está la barra inferior. */
export function FloatingWhatsApp() {
  const { info } = useBusiness();
  const pathname = usePathname();
  if (!info?.whatsapp || pathname.startsWith('/cotizar')) return null;
  return (
    <a
      href={waLink(info.whatsapp, info.whatsappGreeting)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 hidden h-14 items-center gap-2.5 rounded-lg bg-lime pl-4 pr-5 font-bold text-ink shadow-[0_10px_40px_-8px_rgb(198_248_0/0.55)] transition-transform hover:-translate-y-0.5 lg:inline-flex"
    >
      <WhatsAppIcon className="size-6" />
      Escribinos
    </a>
  );
}
