// Crea (o reactiva) un usuario ADMIN del panel con una contraseña nueva generada al azar.
// Uso, desde apps/api:  node scripts/create-admin.mjs correo@dominio "Nombre y apellido"
// Si el correo ya existe, lo deja como ADMIN activo y le asigna la contraseña nueva.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const [rawEmail, ...nameParts] = process.argv.slice(2);
const email = (rawEmail ?? '').trim().toLowerCase();
const name = nameParts.join(' ').trim() || 'Administración';

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Uso: node scripts/create-admin.mjs correo@dominio "Nombre y apellido"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL: correlo desde apps/api, donde está el .env');
  process.exit(1);
}

const password = randomBytes(9).toString('base64url');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rows } = await pool.query(
    `insert into users (email, name, password_hash, role, active)
     values ($1, $2, $3, 'ADMIN', true)
     on conflict (email) do update
       set name = excluded.name, password_hash = excluded.password_hash, role = 'ADMIN', active = true, updated_at = now()
     returning (xmax = 0) as created`,
    [email, name, await bcrypt.hash(password, 12)],
  );
  console.log(rows[0].created ? 'Usuario creado' : 'Usuario existente actualizado');
  console.log(`Panel:      ${(process.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/admin`);
  console.log(`Usuario:    ${email}`);
  console.log(`Contraseña: ${password}`);
} finally {
  await pool.end();
}
