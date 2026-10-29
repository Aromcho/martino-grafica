import Link from 'next/link';
import { ArrowRight, MessageCircle, ShoppingBag, Store } from 'lucide-react';
import { ProductTile } from '@/components/store/product-tile';
import { buttonClass } from '@/components/ui/button';
import { Img } from '@/components/ui/img';
import type { StoreCard, StoreCategory } from '@/lib/types';

/** Categorías de la tienda: cada una con la foto de un producto real sobre blanco */
export function ShopCategories({ categories }: { categories: StoreCategory[] }) {
  const list = categories.filter((c) => c.productCount > 0);
  if (!list.length) return null;
  const total = list.reduce((n, c) => n + c.productCount, 0);
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="tienda-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
        <div className="max-w-2xl">
          <h2 id="tienda-title" className="display t-md">
            Comprá por categoría
          </h2>
          <p className="lede mt-4 text-white/70">Lo mismo que usamos en el taller, para que lo lleves: {total.toLocaleString('es-AR')} productos con precio publicado.</p>
        </div>
        <Link href="/tienda" className={buttonClass('outline', 'md', 'text-white')}>
          Ver toda la tienda
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {list.map((c, i) => (
          <li key={c.slug} className={i === 0 ? 'col-span-2 lg:col-span-1 lg:row-span-2' : undefined}>
            <Link
              href={`/tienda?categoria=${c.slug}`}
              className="group flex h-full flex-col gap-4 rounded-md bg-graphite p-3 ring-1 ring-white/8 transition-colors hover:ring-lime/60 sm:p-4"
            >
              <span className="peel block overflow-hidden rounded-[3px] bg-white">
                <Img
                  media={c.cover}
                  alt={c.name}
                  fit="contain"
                  ratio={i === 0 ? '16/10' : '4/3'}
                  sizes="(min-width: 1024px) 30vw, 46vw"
                  className={i === 0 ? '!bg-white lg:!aspect-[4/5]' : '!bg-white'}
                  imgClassName="p-[8%] transition-transform duration-700 group-hover:scale-[1.05]"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col px-1 pb-1">
                <span className="flex items-start justify-between gap-2">
                  <span className={i === 0 ? 'display text-[clamp(1.6rem,4vw,2.4rem)]' : 'text-[1.05rem] font-extrabold leading-tight sm:text-[1.2rem]'}>{c.name}</span>
                  <ArrowRight className="mt-1 size-5 shrink-0 text-lime transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
                {c.tagline && <span className="mt-1.5 line-clamp-2 text-[0.85rem] text-smoke sm:text-[0.92rem]">{c.tagline}</span>}
                <span className="tabular mt-auto pt-3 text-sm font-bold text-lime">{c.productCount.toLocaleString('es-AR')} productos</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Cómo se compra: tres pasos, sin vueltas */
export function HowToBuy() {
  const steps = [
    { icon: ShoppingBag, title: 'Armá el carrito', text: 'Elegí productos y cantidades con el precio a la vista.' },
    { icon: MessageCircle, title: 'Mandalo por WhatsApp', text: 'Te confirmamos stock, precio final y forma de pago.' },
    { icon: Store, title: 'Retirá o recibí', text: 'Pasás por el taller o coordinamos el envío.' },
  ];
  return (
    <section className="border-y border-white/10 bg-graphite/60" aria-label="Cómo comprar">
      <ol className="container-x grid gap-6 py-8 sm:grid-cols-3 sm:gap-8 lg:py-10">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-lime text-ink">
              <s.icon className="size-5" />
            </span>
            <span>
              <span className="block font-extrabold">
                <span className="tabular mr-1.5 text-lime">{i + 1}.</span>
                {s.title}
              </span>
              <span className="mt-1 block text-[0.92rem] text-smoke">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Los más elegidos de la tienda: carrusel en el celular, grilla en escritorio */
export function FeaturedProducts({ products, title = 'Los más elegidos' }: { products: StoreCard[]; title?: string }) {
  if (!products.length) return null;
  return (
    <section className="py-20 lg:py-28" aria-labelledby="destacados-title">
      <div className="container-x mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="destacados-title" className="display t-md">
            {title}
          </h2>
          <p className="mt-3 text-smoke">Precios publicados en la web. Agregás al carrito y lo confirmamos por WhatsApp.</p>
        </div>
        <Link href="/tienda" className="inline-flex items-center gap-2 font-bold text-lime underline-offset-4 hover:underline">
          Ir a la tienda <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="container-x">
        <ul className="scroll-x -mx-4 gap-4 px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 sm:px-0 lg:grid-cols-5">
          {products.map((p, i) => (
            <li key={p.id} className="flex w-[46vw] shrink-0 sm:w-auto">
              <ProductTile product={p} className="w-full" priority={i < 2} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
