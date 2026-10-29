'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useBusiness } from '@/components/site/business-provider';
import { money, waLink } from '@/lib/format';
import type { StoreCard } from '@/lib/types';
import { QtyStepper, useCart } from './cart';

/** Cantidad + agregar al carrito + consultar por WhatsApp */
export function BuyBox({ product }: { product: StoreCard & { sku?: string | null } }) {
  const { add, lines, setOpen } = useCart();
  const { info } = useBusiness();
  const [qty, setQty] = useState(1);
  const inCart = lines.find((l) => l.id === product.id)?.qty ?? 0;
  const ask = `Hola Martino Gráfica 👋 Quiero consultar por "${product.name}"${product.sku ? ` (${product.sku})` : ''} que vi en la tienda.`;
  return (
    <div className="space-y-4">
      {product.price != null && qty > 1 && (
        <p className="tabular text-sm text-smoke">
          {qty} × {money(product.price)} = <span className="font-bold text-white">{money(product.price * qty)}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} />
        <button type="button" onClick={() => add(product, qty)} className={buttonClass('lime', 'md', 'min-w-[12rem] flex-1')}>
          <ShoppingBag className="size-5" /> Agregar al carrito
        </button>
      </div>
      {inCart > 0 && (
        <p className="text-sm text-white/80">
          Tenés {inCart} en el carrito ·{' '}
          <button type="button" onClick={() => setOpen(true)} className="font-bold text-lime underline-offset-4 hover:underline">
            ver carrito
          </button>{' '}
          o{' '}
          <Link href="/carrito" className="font-bold text-lime underline-offset-4 hover:underline">
            finalizar pedido
          </Link>
        </p>
      )}
      {info?.whatsapp && (
        <a href={waLink(info.whatsapp, ask)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md', 'w-full text-white sm:w-auto')}>
          <WhatsAppIcon className="size-5" /> {product.inStock ? 'Consultar por WhatsApp' : 'Consultar disponibilidad'}
        </a>
      )}
    </div>
  );
}
