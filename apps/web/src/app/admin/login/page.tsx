'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { PlotterLogo } from '@/components/brand/plotter-logo';
import { HttpError, post } from '@/lib/client-api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await post('/auth/login', { email: email.trim(), password });
      const next = params.get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No pudimos conectar con el servidor.');
      setLoading(false);
    }
  };

  const field = 'h-12 w-full rounded-lg bg-white px-4 text-ink outline-none ring-1 ring-black/15 focus:ring-2 focus:ring-ink';
  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <h1 className="display text-[2.4rem] leading-[0.95]">Panel del taller</h1>
      <p className="mt-3 text-slate">Ingresá para ver los pedidos y cargar trabajos, servicios, historias y horarios.</p>
      <label className="mt-8 block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" inputMode="email" className={field} />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold">Contraseña</span>
        <span className="relative block">
          <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={`${field} pr-12`} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-slate hover:bg-black/5" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-md bg-[#fde8e6] px-3.5 py-2.5 text-sm font-semibold text-[#912018]" role="alert">
          {error}
        </motion.p>
      )}
      <button type="submit" disabled={loading} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-bold text-white transition-colors hover:bg-steel disabled:opacity-60">
        {loading && <Loader2 className="size-4 animate-spin" />}
        Ingresar
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex items-center justify-center px-6 py-16">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-ink px-10 max-lg:order-first">
        <div className="w-full max-w-md">
          <PlotterLogo />
        </div>
      </div>
    </main>
  );
}
