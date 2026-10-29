/**
 * Categorías de la tienda y de dónde sale cada una en el catálogo del proveedor.
 * Sólo insumos y productos de gráfica (vinilos, lonas, placas, sublimación, impresión, armado de carteles):
 * quedan afuera los objetos para personalizar tipo tazas, cuadernos o mouse pads.
 */
export interface StoreCategorySeed {
  slug: string;
  name: string;
  tagline: string;
}

export const STORE_CATEGORIES: StoreCategorySeed[] = [
  { slug: 'vinilos', name: 'Vinilos', tagline: 'De corte, impresión, espejados, microperforados y más.' },
  { slug: 'termofilm', name: 'Termofilm', tagline: 'Vinilo textil para estampar remeras, buzos y gorras.' },
  { slug: 'lonas', name: 'Lonas y banners', tagline: 'Lonas, mesh y portabanners para eventos y vidrieras.' },
  { slug: 'placas', name: 'Placas y soportes', tagline: 'PVC espumado, foamboard, alto impacto, polyfan y PET.' },
  { slug: 'impresion', name: 'Impresión y laminado', tagline: 'Papel fotográfico, tintas, transfer, laminados y foil.' },
  { slug: 'sublimacion', name: 'Sublimación', tagline: 'Papel, tintas, cinta térmica y telas teflonadas.' },
  { slug: 'armado', name: 'Armado de carteles', tagline: 'Perfiles, LED, cables, imanes, adhesivos y cintas.' },
  { slug: 'herramientas', name: 'Herramientas', tagline: 'Espátulas, cutters, cuchillas y posicionadores.' },
  { slug: 'equipos', name: 'Equipos', tagline: 'Planchas, impresoras, laminadoras y accesorios.' },
];

export interface SupplierSource {
  /** Ruta de la categoría en el sitio del proveedor (/productos/<path>) */
  path: string;
  category: string;
  subcategory: string;
}

const IC = 'insumos-de-carteleria';
const SUB = 'insumos-para-sublimar';
const PG = 'productos-graficos';

/** El orden importa: si un producto aparece en dos rutas, queda en la primera */
export const SUPPLIER_SOURCES: SupplierSource[] = [
  { path: `${IC}/vinilo`, category: 'vinilos', subcategory: 'Vinilos' },
  { path: `${IC}/laminas`, category: 'vinilos', subcategory: 'Láminas' },
  { path: `${IC}/microperforados`, category: 'vinilos', subcategory: 'Microperforados' },
  { path: `${IC}/poliester`, category: 'vinilos', subcategory: 'Poliéster' },
  { path: `${IC}/termofilm`, category: 'termofilm', subcategory: 'Termofilm' },
  { path: `${IC}/lonas`, category: 'lonas', subcategory: 'Lonas' },
  { path: `${IC}/portabanner`, category: 'lonas', subcategory: 'Portabanners' },
  { path: `${IC}/pvc-espumado`, category: 'placas', subcategory: 'PVC espumado' },
  { path: `${IC}/foamboard`, category: 'placas', subcategory: 'Foamboard' },
  { path: `${IC}/alto-impacto`, category: 'placas', subcategory: 'Alto impacto' },
  { path: `${IC}/polyfan`, category: 'placas', subcategory: 'Polyfan' },
  { path: `${IC}/plastico-corrugado`, category: 'placas', subcategory: 'Plástico corrugado' },
  { path: `${IC}/pet`, category: 'placas', subcategory: 'PET' },
  { path: `${IC}/acrilicos`, category: 'placas', subcategory: 'Acrílicos' },
  { path: `${IC}/fibro`, category: 'placas', subcategory: 'Fibro' },
  { path: `${PG}/papel-fotografico`, category: 'impresion', subcategory: 'Papel fotográfico' },
  { path: `${PG}/tinta-fotografica`, category: 'impresion', subcategory: 'Tinta fotográfica' },
  { path: `${PG}/transfer`, category: 'impresion', subcategory: 'Papel transfer' },
  { path: `${PG}/laminados`, category: 'impresion', subcategory: 'Laminados' },
  { path: `${PG}/foil`, category: 'impresion', subcategory: 'Foil' },
  { path: `${PG}/film`, category: 'impresion', subcategory: 'Film' },
  { path: `${PG}/tinta-dtf`, category: 'impresion', subcategory: 'Tinta DTF' },
  { path: `${PG}/polvo-poliamida`, category: 'impresion', subcategory: 'Polvo poliamida' },
  { path: `${PG}/toner`, category: 'impresion', subcategory: 'Tóner' },
  { path: `${PG}/pulseras-identificatorias`, category: 'impresion', subcategory: 'Pulseras identificatorias' },
  { path: `${SUB}/papel-para-sublimar`, category: 'sublimacion', subcategory: 'Papel para sublimar' },
  { path: `${SUB}/tinta-sublimacion`, category: 'sublimacion', subcategory: 'Tinta para sublimar' },
  { path: `${SUB}/cinta-termica`, category: 'sublimacion', subcategory: 'Cinta térmica' },
  { path: `${SUB}/telas-teflonadas`, category: 'sublimacion', subcategory: 'Telas teflonadas' },
  { path: `${SUB}/adhesivos`, category: 'sublimacion', subcategory: 'Adhesivos' },
  { path: `${SUB}/metal`, category: 'sublimacion', subcategory: 'Chapas' },
  { path: `${IC}/perfiles`, category: 'armado', subcategory: 'Perfiles y kits' },
  { path: `${IC}/led`, category: 'armado', subcategory: 'LED' },
  { path: `${IC}/cable`, category: 'armado', subcategory: 'Cables' },
  { path: `${IC}/iman`, category: 'armado', subcategory: 'Imanes' },
  { path: `${IC}/adhesivos`, category: 'armado', subcategory: 'Adhesivos' },
  { path: `${IC}/cintas-adhesivas`, category: 'armado', subcategory: 'Cintas adhesivas' },
  { path: `${IC}/herramientas`, category: 'herramientas', subcategory: 'Herramientas' },
  { path: `${IC}/cuchillas`, category: 'herramientas', subcategory: 'Cuchillas' },
  { path: `${IC}/espatulas`, category: 'herramientas', subcategory: 'Espátulas' },
  { path: `${IC}/posicionador`, category: 'herramientas', subcategory: 'Posicionadores' },
  { path: 'equipos/planchas', category: 'equipos', subcategory: 'Planchas' },
  { path: 'equipos/impresoras', category: 'equipos', subcategory: 'Impresoras' },
  { path: 'equipos/laminadora', category: 'equipos', subcategory: 'Laminadoras' },
  { path: 'equipos/accesorios', category: 'equipos', subcategory: 'Accesorios' },
];

/** Por las dudas: objetos personalizables que no van en una tienda de gráfica */
export const EXCLUDED_NAME = /^(cuaderno|mouse|taza|libreta|agenda|llavero|lapicera|pijama|almohad|vaso|rompecabeza|set jard)/i;
