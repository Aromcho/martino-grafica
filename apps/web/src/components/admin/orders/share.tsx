'use client';

import { Check, Copy, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Textarea } from '@/components/admin/ui';
import { WhatsAppIcon } from '@/components/ui/icons';
import { post } from '@/lib/client-api';
import type { WorkOrderDetail } from '@/lib/types';

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
    return true;
  } catch {
    toast.error('No se pudo copiar. Mantené apretado el texto y copialo a mano.');
    return false;
  }
}

/**
 * Link de seguimiento para pasarle al cliente: se copia o sale por WhatsApp con el mensaje ya armado
 * (el mensaje cambia según en qué etapa está el pedido y se puede retocar antes de mandarlo).
 */
export function TrackShare({ order, onSent }: { order: WorkOrderDetail; onSent?: () => void }) {
  // El link usa el dominio en el que está abierto el panel
  const [url, setUrl] = useState(order.trackUrl);
  const [message, setMessage] = useState(order.message);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const local = `${window.location.origin}/seguimiento/${order.code}`;
    setUrl(local);
    setMessage(order.message.split(order.trackUrl).join(local));
  }, [order.code, order.message, order.trackUrl]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const send = () => {
    window.open(`https://wa.me/${order.customerWhatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    post(`/admin/orders/${order.id}/whatsapp`)
      .then(() => onSent?.())
      .catch(() => {});
  };

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="tabular flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-liner px-3.5 text-sm font-semibold text-ink ring-1 ring-black/8 hover:bg-liner-deep" title="Ver como lo ve el cliente">
          <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
          <ExternalLink className="size-3.5 shrink-0 text-slate" />
        </a>
        <Btn variant="outline" onClick={async () => setCopied(await copy(url, 'Link copiado'))} aria-label="Copiar el link de seguimiento">
          {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />} {copied ? 'Copiado' : 'Copiar'}
        </Btn>
      </div>
      <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Mensaje para el cliente" />
      <div className="flex flex-wrap items-center gap-2">
        {order.customerWhatsapp ? (
          <Btn variant="lime" onClick={send} disabled={!message.trim()}>
            <WhatsAppIcon className="size-5" /> Mandar por WhatsApp
          </Btn>
        ) : (
          <Btn variant="lime" onClick={() => copy(message, 'Mensaje copiado')} disabled={!message.trim()}>
            <Copy className="size-4" /> Copiar el mensaje
          </Btn>
        )}
        {order.customerWhatsapp ? (
          <Btn variant="ghost" size="sm" onClick={() => copy(message, 'Mensaje copiado')}>
            Copiar el mensaje
          </Btn>
        ) : (
          <span className="text-xs text-slate">Este pedido no tiene WhatsApp cargado: copiá el mensaje y pegalo donde hables con el cliente.</span>
        )}
      </div>
    </div>
  );
}
