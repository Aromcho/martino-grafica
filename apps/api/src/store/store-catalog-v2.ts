/**
 * Lista real de productos del taller (noviembre 2026), repartida en las columnas de la tienda.
 * Sin precio = «Consultar precio». Se carga una sola vez al arrancar la API (ver StoreImportService);
 * después todo se edita desde el panel.
 */
export const CATALOG_V2_KEY = 'storeCatalogV2';

export interface WorkshopProduct {
  slug: string;
  name: string;
  /** Slug de la categoría de la tienda */
  category: string;
  price: number | null;
  unit?: string;
  description?: string;
  /** Foto de un trabajo real del taller (ya está en Medios) */
  mediaId?: string;
  /** Foto de producto generada con Kling (para los que no tienen foto en el Instagram) */
  imageUrl?: string;
}

const PLANCHA = 'plancha de 1 m²';
const KLING = 'https://s15-kling.klingai.com/kimg/';

/** En este orden se muestran en la tienda; los primeros salen en la portada */
export const WORKSHOP_PRODUCTS: WorkshopProduct[] = [
  { slug: 'banner-comun', name: 'Banner común', category: 'carteleria', price: 110_000, mediaId: '76d631cb-be0a-423a-bbcf-b591796a7c95' },
  { slug: 'remeras-estampadas', name: 'Remeras estampadas', category: 'estampados', price: null, mediaId: '5f19ac16-0132-4191-91f4-2b64e950dc67' },
  { slug: 'calcos-para-vehiculos', name: 'Calcos para vehículos', category: 'ploteos', price: null, mediaId: 'b680f633-a71c-498e-ba10-467199469036' },
  { slug: 'stickers', name: 'Stickers (plancha de 1 m²)', category: 'calcos', price: 25_000, unit: PLANCHA, mediaId: '3f90f0f9-2eff-4b97-9dfc-9a826a1808fa' },
  { slug: 'carteles-luminosos', name: 'Carteles luminosos', category: 'carteleria', price: null, mediaId: '9da68218-9927-4004-b062-2277b8e2c546' },
  { slug: 'senaletica', name: 'Señalética', category: 'senaleticas', price: null, mediaId: '89c356a5-48cf-4ada-a805-3a51cdd88d45' },
  { slug: 'gorras-estampadas', name: 'Gorras estampadas', category: 'estampados', price: null, mediaId: '7b2c3b33-06d7-42d2-a632-27b4fcc273ad' },
  {
    slug: 'imanes-para-remiseria',
    name: 'Imanes para remisería (el par)',
    category: 'ploteos',
    price: 50_000,
    unit: 'par',
    imageUrl: `${KLING}EMXN1y8qsAEKBnVwbG9hZBIOeWxhYi1zdHVudC1zZ3AalQFLbGluZ0FJX0tvbG9yc19EaVRfSDgwMF8yX0tvbG9ycy12Ml82LXQyaS1kaXN0aWxsLWVuY19kaXRfdmFlLXJlYWxfdW5yZWFsXzFfU0dQX1BST0RfYWlfd2ViXzMyNTkwMzQxNDMxNDExOF9lYzc5M2MxMDQyZDk2MTU4N2YzOTFmNTE5ZGU0OThhZTlyaTQ4LnBuZw.origin?x-kcdn-pid=112372`,
  },
  { slug: 'carteles-de-neon-led', name: 'Carteles de neón LED', category: 'carteleria', price: null, mediaId: '965955bf-5dfe-46e8-828d-5e5e40c00e41' },
  { slug: 'stickers-tornasolados', name: 'Stickers tornasolados (plancha de 1 m²)', category: 'calcos', price: 45_000, unit: PLANCHA, mediaId: '8ba94fd0-8108-402a-af23-548ba65eb2a8' },
  {
    slug: 'roll-up',
    name: 'Roll Up',
    category: 'carteleria',
    price: 130_000,
    imageUrl: `${KLING}EMXN1y8qsAEKBnVwbG9hZBIOeWxhYi1zdHVudC1zZ3AalQFLbGluZ0FJX0tvbG9yc19EaVRfSDgwMF8yX0tvbG9ycy12Ml82LXQyaS1kaXN0aWxsLWVuY19kaXRfdmFlLXJlYWxfdW5yZWFsXzFfU0dQX1BST0RfYWlfd2ViXzMyNTkwMzI4NDMwODk2OV9hOTA2MDkxNDM3NGI2OTkzYWE0ZmVjY2M1M2IwMjIzYWl5ZG1lLnBuZw.origin?x-kcdn-pid=112372`,
  },
  { slug: 'placas-de-acrilico', name: 'Placas de acrílico', category: 'senaleticas', price: null, mediaId: '0cf014c6-011e-45c6-b677-8bff5ffbb578' },
  {
    slug: 'cubre-patentes',
    name: 'Cubre patentes con tu logo',
    category: 'ploteos',
    price: 20_000,
    description: 'Personalizados con tu logo.',
    imageUrl: `${KLING}EMXN1y8qsAEKBnVwbG9hZBIOeWxhYi1zdHVudC1zZ3AalQFLbGluZ0FJX0tvbG9yc19EaVRfSDgwMF8yX0tvbG9ycy12Ml82LXQyaS1kaXN0aWxsLWVuY19kaXRfdmFlLXJlYWxfdW5yZWFsXzFfU0dQX1BST0RfYWlfd2ViXzMyNTkwMzI4MzMxNTk3OV9hOTlhZTJlYzUyZjc3NzhjN2RiOTRiZWUxYTgyYjI1NjNjc2cyLnBuZw.origin?x-kcdn-pid=112372`,
  },
  { slug: 'carteles-exterior-interior', name: 'Carteles para exterior e interior', category: 'carteleria', price: null, mediaId: '37031d40-45a4-45ff-b295-fadea31ec4de' },
  { slug: 'stickers-laminados', name: 'Stickers laminados (plancha de 1 m²)', category: 'calcos', price: 35_000, unit: PLANCHA, mediaId: '955f7aee-4097-498d-9092-1aa3af31b5b0' },
  {
    slug: 'stickers-dtf-uv',
    name: 'Stickers DTF UV (plancha de 1 m²)',
    category: 'calcos',
    price: 70_000,
    unit: PLANCHA,
    imageUrl: `${KLING}EMXN1y8qsAEKBnVwbG9hZBIOeWxhYi1zdHVudC1zZ3AalQFLbGluZ0FJX0tvbG9yc19EaVRfSDgwMF8yX0tvbG9ycy12Ml82LXQyaS1kaXN0aWxsLWVuY19kaXRfdmFlLXJlYWxfdW5yZWFsXzFfU0dQX1BST0RfYWlfd2ViXzMyNTkwMzI4NTUyODk0OV9iN2UwN2VlODgyNDRkMjM4YWZiMzM5M2Y1ODliNWU4M2x4ZWpiLnBuZw.origin?x-kcdn-pid=112372`,
  },
];

/** Portada de cada categoría: fotos de trabajos reales (Insumos usa la foto de su primer producto) */
export const CATEGORY_COVERS: Record<string, string> = {
  ploteos: 'b680f633-a71c-498e-ba10-467199469036',
  carteleria: '965955bf-5dfe-46e8-828d-5e5e40c00e41',
  estampados: '7b2c3b33-06d7-42d2-a632-27b4fcc273ad',
  calcos: '8ba94fd0-8108-402a-af23-548ba65eb2a8',
  senaleticas: '89c356a5-48cf-4ada-a805-3a51cdd88d45',
};
