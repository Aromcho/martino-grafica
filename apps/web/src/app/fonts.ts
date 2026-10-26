import localFont from 'next/font/local';

/** Archivo variable con ejes de peso (100–900) y ancho (62–125 %): expandida para titulares, normal para texto */
export const archivo = localFont({
  src: [
    { path: './fonts/archivo-latin-wdth-normal.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/archivo-latin-ext-wdth-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-archivo',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  fallback: ['system-ui', 'Arial'],
});
