import { SQL, sql } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';

const FROM = 'áéíóúüñàèìòùâêîôûäëïö';
const TO = 'aeiouunaeiouaeiouaeio';

/** Normaliza un texto para búsquedas sin acentos ni mayúsculas */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[%_\\]/g, '')
    .trim();
}

/** Columna de texto normalizada en SQL (lower + sin acentos) */
export function normCol(col: AnyPgColumn | SQL): SQL {
  return sql`translate(lower(coalesce(${col}, '')), ${FROM}, ${TO})`;
}

/** ILIKE acento-insensible: col contiene term */
export function fuzzyContains(col: AnyPgColumn | SQL, term: string): SQL {
  return sql`${normCol(col)} LIKE ${'%' + normalizeTerm(term) + '%'}`;
}

/** Algún elemento del array de texto contiene el término (acento-insensible) */
export function arrayFuzzyContains(arrays: AnyPgColumn[], term: string): SQL {
  const joined = sql.join(arrays.map((a) => sql`${a}`), sql` || `);
  return sql`EXISTS (SELECT 1 FROM unnest(${joined}) AS x WHERE translate(lower(x), ${FROM}, ${TO}) LIKE ${'%' + normalizeTerm(term) + '%'})`;
}
