'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { forwardRef, useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from 'vaul';
import { cn } from '@/lib/cn';

/**
 * Piezas del panel. Fondo liner claro, tarjetas blancas, tinta negra; las acciones principales en negro
 * y el lima sólo para marcar lo activo (como en la web).
 */
export function PageHeader({ title, text, actions, back }: { title: string; text?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 lg:mb-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[1.85rem] leading-[0.95] text-ink lg:text-[2.4rem]">{title}</h1>
          {text && <p className="mt-2 max-w-2xl text-slate">{text}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ className, children, title, actions, id }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn('rounded-md bg-white p-4 shadow-[0_1px_0_rgb(0_0_0/0.04)] ring-1 ring-black/8 sm:p-5 lg:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[1.02rem] font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children, className, optional }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string; optional?: boolean }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {optional && <span className="font-normal text-slate">(opcional)</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

export const control =
  'w-full rounded-lg bg-white px-3.5 text-[0.95rem] text-ink outline-none ring-1 ring-black/15 transition-shadow placeholder:text-slate/60 focus:ring-2 focus:ring-ink disabled:bg-liner disabled:text-slate';

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(control, 'h-11', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(control, 'py-2.5 leading-relaxed', className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<'select'>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(control, 'h-11 pr-8', className)} {...p} />;
});

/** Precio en pesos: muestra con separador de miles y guarda número entero */
export function MoneyInput({ value, onChange, placeholder, className }: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value != null ? value.toLocaleString('es-AR') : '');
  useEffect(() => {
    setText(value != null ? value.toLocaleString('es-AR') : '');
  }, [value]);
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate">$</span>
      <input
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          setText(digits ? Number(digits).toLocaleString('es-AR') : '');
          onChange(digits ? Number(digits) : null);
        }}
        className={cn(control, 'tabular h-11 pl-7')}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-lg py-2 text-left">
      <span>
        <span className="block text-[0.95rem] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-slate">{hint}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-ink' : 'bg-black/15')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cn('absolute top-1 size-5 rounded-full shadow', checked ? 'right-1 bg-lime' : 'left-1 bg-white')} />
      </span>
    </button>
  );
}

const TONES = {
  neutral: 'bg-liner text-slate ring-black/8',
  lime: 'bg-lime text-ink ring-transparent',
  ink: 'bg-ink text-white ring-transparent',
  warn: 'bg-[#fff3d6] text-[#7a5200] ring-transparent',
  red: 'bg-[#fde8e6] text-[#912018] ring-transparent',
  ok: 'bg-[#dcf5e6] text-[#145c33] ring-transparent',
  cut: 'bg-cut/10 text-cut ring-transparent',
} as const;

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold ring-1', TONES[tone], className)}>{children}</span>;
}

export function Btn({ variant = 'ink', size = 'md', className, ...p }: ComponentProps<'button'> & { variant?: 'ink' | 'lime' | 'ghost' | 'outline' | 'danger'; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4.5 text-[0.95rem]',
        variant === 'ink' && 'bg-ink text-white hover:bg-steel',
        variant === 'lime' && 'bg-lime text-ink hover:bg-lime-deep',
        variant === 'ghost' && 'text-ink hover:bg-black/5',
        variant === 'outline' && 'bg-white text-ink ring-1 ring-black/15 hover:ring-black/40',
        variant === 'danger' && 'bg-danger text-white hover:bg-[#b42318]',
        className,
      )}
      {...p}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-slate', className)} aria-label="Cargando" />;
}

export function LoadingBlock() {
  return (
    <div className="grid place-items-center py-24">
      <Spinner className="size-7" />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-md border-2 border-dashed border-black/15 bg-white/60 px-6 py-14 text-center">
      <p className="text-lg font-extrabold text-ink">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-slate">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Borrar en dos toques: el primero pide confirmación */
export function DeleteButton({ onConfirm, label = 'Eliminar', pending, compact }: { onConfirm: () => void; label?: string; pending?: boolean; compact?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        if (armed) onConfirm();
        else setArmed(true);
      }}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-colors',
        compact ? 'w-10' : 'px-3.5',
        armed ? 'bg-danger text-white' : 'text-danger hover:bg-[#fde8e6]',
        compact && armed && 'w-auto px-3',
      )}
      aria-label={armed ? '¿Confirmás? Tocá de nuevo para eliminar' : label}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {(!compact || armed) && <span>{armed ? '¿Seguro?' : label}</span>}
    </button>
  );
}

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setDesktop(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}

/** Panel lateral en escritorio, hoja desde abajo en el celular */
export function EditorDrawer({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const desktop = useDesktop();
  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} direction={desktop ? 'right' : 'bottom'} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            'fixed z-[61] flex flex-col bg-white text-ink outline-none',
            desktop ? cn('inset-y-3 right-3 rounded-md shadow-2xl', wide ? 'w-[min(52rem,calc(100vw-1.5rem))]' : 'w-[min(36rem,calc(100vw-1.5rem))]') : 'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-xl',
          )}
          data-lenis-prevent
        >
          {!desktop && <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-black/15" />}
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
            <Drawer.Title className="min-w-0 truncate text-lg font-extrabold text-ink">{title}</Drawer.Title>
            <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-black/5" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
          {footer && <div className="border-t border-black/10 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Barra flotante de "guardar" cuando hay cambios sin guardar */
export function SaveBar({ dirty, saving, onSave, onReset, label = 'Guardar cambios' }: { dirty: boolean; saving?: boolean; onSave: () => void; onReset?: () => void; label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  // En un portal: el contenedor animado de la página no debe "atrapar" la barra fija
  return createPortal(
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 lg:bottom-4 mx-auto flex max-w-xl items-center justify-end gap-3 rounded-lg bg-ink py-2 pl-5 pr-2 text-white shadow-2xl sm:justify-between lg:left-[calc(15.5rem+1.5rem)]"
        >
          <span className="text-sm font-semibold max-sm:hidden">Tenés cambios sin guardar</span>
          <span className="flex gap-1.5">
            {onReset && (
              <button type="button" onClick={onReset} className="h-10 rounded-md px-4 text-sm font-bold text-white/75 hover:text-white">
                Descartar
              </button>
            )}
            <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-lime px-5 text-sm font-bold text-ink disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
              {label}
            </button>
          </span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SegmentedTabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; className?: string }) {
  const id = useId();
  return (
    <div className={cn('scroll-x gap-1.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('relative h-9 shrink-0 rounded-md px-3.5 text-sm font-bold transition-colors', value === o.value ? 'text-lime' : 'bg-white text-slate ring-1 ring-black/10 hover:text-ink')}
        >
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-md bg-ink" transition={{ type: 'spring', stiffness: 450, damping: 35 }} />}
          <span className="relative">
            {o.label}
            {o.count !== undefined && <span className={cn('tabular ml-1.5 font-semibold', value === o.value ? 'text-white/70' : 'text-slate/70')}>{o.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Lista editable de renglones (materiales, terminaciones, características) */
export function LinesInput({ value, onChange, placeholder, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => {
    if (text.split('\n').map((s) => s.trim()).filter(Boolean).join('\n') !== value.join('\n')) setText(value.join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
