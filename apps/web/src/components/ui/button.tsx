import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'lime' | 'ink' | 'paper' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold transition-[background-color,color,box-shadow,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  lime: 'bg-lime text-ink hover:bg-white',
  ink: 'bg-ink text-white hover:bg-steel',
  paper: 'bg-white text-ink hover:bg-lime',
  ghost: 'text-current hover:bg-white/10',
  outline: 'text-current ring-1 ring-inset ring-current/35 hover:ring-current',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 rounded-md px-3.5 text-sm',
  md: 'h-12 rounded-lg px-5 text-[0.98rem]',
  lg: 'h-14 rounded-lg px-6 text-[1.05rem]',
};

export function buttonClass(variant: Variant = 'lime', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  external,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; external?: boolean } & Omit<ComponentProps<'a'>, 'href'>) {
  if (external || /^https?:|^mailto:|^tel:/.test(href)) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
