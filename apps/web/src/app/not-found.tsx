import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';

/** 404 de rutas fuera del sitio (sin header): mismo cartel que el del sitio */
export default function NotFound() {
  return (
    <main className="container-x grid min-h-svh content-center py-12 bg-ink">
      <div className="liner relative max-w-2xl overflow-hidden rounded-md p-8 sm:p-12" style={{ ['--cm' as string]: '20px' }}>
        <span className="absolute inset-4 rounded border-2 border-dashed border-cut" aria-hidden="true" />
        <p className="tabular relative text-sm font-bold text-slate">Error 404</p>
        <h1 className="display relative mt-3 text-[clamp(2.2rem,8vw,4rem)]">Esta página no está en la plancha</h1>
        <p className="relative mt-4 max-w-md text-slate">Puede que el trabajo se haya despublicado o que el link tenga un error.</p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href="/trabajos" className={buttonClass('ink', 'md')}>
            Ver trabajos
          </Link>
          <Link href="/" className={buttonClass('outline', 'md', 'text-ink')}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
