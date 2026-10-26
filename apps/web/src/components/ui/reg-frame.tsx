import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Marco con marcas de registro del plotter (impresión + corte de contorno):
 * tres cuadrados en las esquinas, como los que lee el sensor óptico antes de cortar.
 */
export function RegFrame({ children, className, tone = 'light' }: { children: ReactNode; className?: string; tone?: 'light' | 'dark' }) {
  return (
    <div className={cn('reg', tone === 'light' ? 'text-white/85' : 'text-ink', className)}>
      {children}
      <span className="reg-b" aria-hidden="true" />
    </div>
  );
}
