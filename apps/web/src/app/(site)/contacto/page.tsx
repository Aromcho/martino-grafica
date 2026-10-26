import type { Metadata } from 'next';
import { ContactForm } from '@/components/site/contact-form';
import { Visit } from '@/components/home/visit';
import { Process } from '@/components/home/process';
import { PageHeader } from '@/components/ui/page-header';
import { getBusiness } from '@/lib/api';

export const metadata: Metadata = {
  title: 'El taller',
  description: 'Martino Gráfica: taller de diseño, impresión y colocación en Boulevard Silvio Gesell 1136, Villa Gesell. Dirección, horarios, WhatsApp y contacto.',
  alternates: { canonical: '/contacto' },
};

export default async function ContactPage() {
  const { info } = await getBusiness();
  const stats = info?.stats;
  return (
    <>
      <PageHeader title="El taller" lede={info?.description}>
        {(info?.owner || stats) && (
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/12 pt-6 sm:grid-cols-4">
            {info?.owner && (
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-sm text-smoke">A cargo</dt>
                <dd className="mt-1 font-bold">{info.owner}</dd>
              </div>
            )}
            {stats?.since && (
              <div>
                <dt className="text-sm text-smoke">Publicando trabajos desde</dt>
                <dd className="tabular display mt-1 text-3xl">{stats.since}</dd>
              </div>
            )}
            {stats?.posts && (
              <div>
                <dt className="text-sm text-smoke">Publicaciones en Instagram</dt>
                <dd className="tabular display mt-1 text-3xl">{stats.posts.toLocaleString('es-AR')}</dd>
              </div>
            )}
            {stats?.followers && (
              <div>
                <dt className="text-sm text-smoke">Seguidores</dt>
                <dd className="tabular display mt-1 text-3xl">{stats.followers.toLocaleString('es-AR')}</dd>
              </div>
            )}
          </dl>
        )}
        {info?.credentials && <p className="mt-6 max-w-2xl text-smoke">{info.credentials}</p>}
      </PageHeader>

      <Visit id="horarios" />

      <section id="escribinos" className="liner scroll-mt-20 py-16 lg:py-24" style={{ ['--cm' as string]: '22px' }} aria-labelledby="contacto-title">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <h2 id="contacto-title" className="display t-md">
              Escribinos
            </h2>
            <p className="lede mt-4 text-slate">Para una consulta rápida. Si ya sabés qué necesitás, usá el cotizador: llega con la medida y los archivos.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Process />
    </>
  );
}
