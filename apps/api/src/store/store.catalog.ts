/**
 * Categorías de la tienda (las columnas del taller) y de dónde salen los insumos en el catálogo del proveedor.
 * Lo del proveedor va todo a «Insumos», agrupado por tipo (vinilos, lonas, placas…);
 * quedan afuera los objetos para personalizar tipo tazas, cuadernos o mouse pads.
 */
export interface StoreCategorySeed {
  slug: string;
  name: string;
  tagline: string;
}

export const INSUMOS_SLUG = 'insumos';

/**
 * Importación del catálogo del proveedor. Apagada desde noviembre de 2026: Martino pidió borrar esos
 * productos y vender sólo lo suyo (los insumos propios se cargan a mano desde el panel).
 */
export const SUPPLIER_IMPORT_ENABLED = false;

export const STORE_CATEGORIES: StoreCategorySeed[] = [
  { slug: 'ploteos', name: 'Ploteos', tagline: 'Calcos para vehículos, imanes para remisería y cubre patentes con tu logo.' },
  { slug: 'carteleria', name: 'Cartelería', tagline: 'Banners, roll up y carteles para exterior e interior, luminosos y de neón LED.' },
  { slug: 'estampados', name: 'Estampados', tagline: 'Remeras y gorras estampadas.' },
  { slug: 'calcos', name: 'Calcos', tagline: 'Stickers comunes, laminados, tornasolados y DTF UV.' },
  { slug: 'senaleticas', name: 'Señaléticas', tagline: 'Señalética y placas de acrílico.' },
  { slug: INSUMOS_SLUG, name: 'Insumos', tagline: '' },
];

/** Tipo de insumo (sub-rubro dentro de «Insumos») según el grupo del proveedor */
export const INSUMOS_GROUPS: Record<string, string> = {
  vinilos: 'Vinilos',
  termofilm: 'Termofilm',
  lonas: 'Lonas y banners',
  placas: 'Placas y soportes',
  impresion: 'Impresión y laminado',
  sublimacion: 'Sublimación',
  armado: 'Armado de carteles',
  herramientas: 'Herramientas',
  equipos: 'Equipos',
};

export interface SupplierSource {
  /** Ruta de la categoría en el sitio del proveedor (/productos/<path>) */
  path: string;
  /** Grupo de insumos (clave de INSUMOS_GROUPS) */
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
