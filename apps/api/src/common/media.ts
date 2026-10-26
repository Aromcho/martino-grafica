/** Columnas de Media que necesita el frontend para pintar una imagen optimizada */
export const mediaColumns = {
  id: true,
  kind: true,
  path: true,
  variants: true,
  width: true,
  height: true,
  blurDataUrl: true,
  dominantColor: true,
  alt: true,
} as const;
