'use client';

import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useBusiness } from './business-provider';

const field =
  'w-full rounded-lg bg-white px-3.5 text-[1rem] text-ink outline-none ring-1 ring-black/15 placeholder:text-slate/70 focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger';

/** Consulta rápida: queda registrada en el panel y abre WhatsApp con el mensaje armado */
export function ContactForm() {
  const { info } = useBusiness();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string; whatsappUrl: string | null } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mg-cliente') ?? 'null') as { name?: string; phone?: string; email?: string } | null;
      if (saved) {
        setName(saved.name ?? '');
        setPhone(saved.phone ?? '');
        setEmail(saved.email ?? '');
      }
    } catch {
      /* sin storage */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Contanos tu nombre';
    if (!/^[\d\s()+-]{8,24}$/.test(phone.trim())) errs.phone = 'Revisá el teléfono: con código de área, sólo números';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Revisá el email';
    if (message.trim().length < 5) errs.message = 'Escribí tu consulta';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const win = info?.whatsapp ? window.open('', '_blank') : null;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('kind', 'CONTACT');
      fd.append('customerName', name.trim());
      fd.append('phone', phone.trim());
      if (email.trim()) fd.append('email', email.trim());
      fd.append('message', message.trim());
      if (website) fd.append('website', website);
      const res = await fetch('/api/quotes', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(res.status === 429 ? 'Mandaste varias consultas seguidas. Esperá unos minutos o escribinos por WhatsApp.' : [data?.message].flat().join('. ') || 'No pudimos enviar la consulta.');
      try {
        localStorage.setItem('mg-cliente', JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }));
      } catch {
        /* sin storage */
      }
      setDone({ code: data.code, whatsappUrl: data.whatsappUrl });
      if (win && data.whatsappUrl) win.location.href = data.whatsappUrl;
      else win?.close();
    } catch (err) {
      win?.close();
      setErrors({ form: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-md bg-white p-6 text-ink shadow-[0_22px_44px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/5 sm:p-8" role="status">
        <span className="grid size-11 place-items-center rounded-full bg-lime" aria-hidden="true">
          <Check className="size-5" strokeWidth={3} />
        </span>
        <p className="mt-4 text-xl font-extrabold">Consulta enviada ({done.code})</p>
        <p className="mt-2 text-slate">La recibimos. Si querés respuesta más rápida, mandala también por WhatsApp.</p>
        {done.whatsappUrl && (
          <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('ink', 'md', 'mt-5')}>
            <WhatsAppIcon className="size-5 text-lime" /> Abrir WhatsApp
          </a>
        )}
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`c-${k}-err`} className="mt-1.5 text-sm font-semibold text-danger" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="relative grid gap-4 rounded-md bg-white p-5 shadow-[0_22px_44px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/5 sm:grid-cols-2 sm:p-7">
      <div>
        <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold text-ink">
          Nombre
        </label>
        <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={cn(field, 'h-12')} aria-invalid={Boolean(errors.name)} aria-describedby="c-name-err" />
        {err('name')}
      </div>
      <div>
        <label htmlFor="c-phone" className="mb-1.5 block text-sm font-semibold text-ink">
          WhatsApp
        </label>
        <input id="c-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={24} placeholder="2255 123456" className={cn(field, 'tabular h-12')} aria-invalid={Boolean(errors.phone)} aria-describedby="c-phone-err" />
        {err('phone')}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold text-ink">
          Email <span className="font-normal text-slate">(opcional)</span>
        </label>
        <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cn(field, 'h-12')} aria-invalid={Boolean(errors.email)} aria-describedby="c-email-err" />
        {err('email')}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold text-ink">
          Consulta
        </label>
        <textarea id="c-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} className={cn(field, 'py-3 leading-relaxed')} aria-invalid={Boolean(errors.message)} aria-describedby="c-message-err" />
        {err('message')}
      </div>
      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="c-website">No completar</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        {errors.form && (
          <p className="mb-3 rounded-md bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <button type="submit" disabled={sending} className={buttonClass('ink', 'lg', 'w-full sm:w-auto')}>
          {sending ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5 text-lime" />} Enviar consulta
        </button>
      </div>
    </form>
  );
}
