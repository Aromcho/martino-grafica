/** Mientras carga: la cuchilla del plotter recorre una línea de corte */
export default function Loading() {
  return (
    <div className="container-x grid min-h-[70svh] place-items-center pt-[var(--header-h)]" role="status" aria-label="Cargando">
      <div className="relative h-1 w-48 overflow-hidden rounded-full">
        <span className="cut-line absolute inset-0" />
        <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white motion-safe:animate-[blade_1.1s_var(--ease-cut)_infinite_alternate]" />
      </div>
    </div>
  );
}
