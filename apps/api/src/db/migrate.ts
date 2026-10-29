/**
 * Aplica las migraciones SQL de /drizzle sobre la base configurada en DATABASE_URL.
 * Uso: npm run db:migrate   (en producción: npm run db:migrate:prod)
 * La API también las aplica sola al arrancar (main.ts), así un deploy que sólo reinicia no queda a medias.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'path';
import { Pool } from 'pg';

export async function runMigrations(url = process.env.DATABASE_URL, log: (msg: string) => void = console.log) {
  const pool = new Pool({ connectionString: url });
  try {
    // Docker puede tardar unos segundos en levantar Postgres: reintenta hasta 40 s
    for (let i = 0; ; i++) {
      try {
        await pool.query('select 1');
        break;
      } catch (err) {
        if (i >= 20) throw err;
        if (i === 0) log('Esperando a que la base de datos esté lista…');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    await migrate(drizzle(pool), { migrationsFolder: resolve(__dirname, '../../drizzle') });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log('✓ Migraciones aplicadas'))
    .catch((err) => {
      console.error('✗ Error aplicando migraciones:', err);
      process.exit(1);
    });
}
