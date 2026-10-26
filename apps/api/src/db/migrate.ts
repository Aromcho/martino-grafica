/**
 * Aplica las migraciones SQL de /drizzle sobre la base configurada en DATABASE_URL.
 * Uso: npm run db:migrate   (en producción: npm run db:migrate:prod)
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'path';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Docker puede tardar unos segundos en levantar Postgres: reintenta hasta 40 s
  for (let i = 0; ; i++) {
    try {
      await pool.query('select 1');
      break;
    } catch (err) {
      if (i >= 20) throw err;
      if (i === 0) console.log('Esperando a que la base de datos esté lista…');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const db = drizzle(pool);
  const migrationsFolder = resolve(__dirname, '../../drizzle');
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log('✓ Migraciones aplicadas');
}

main().catch((err) => {
  console.error('✗ Error aplicando migraciones:', err);
  process.exit(1);
});
