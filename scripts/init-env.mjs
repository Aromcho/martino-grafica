// Crea los .env a partir de los ejemplos (si no existen) y genera secretos aleatorios.
// Funciona igual en Windows, Mac y Linux: `npm run env` (lo llama `npm run setup`).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const secret = () => randomBytes(32).toString('base64url');
const apiEnv = 'apps/api/.env';
const webEnv = 'apps/web/.env.local';

let revalidate = secret();
if (existsSync(apiEnv)) {
  const m = readFileSync(apiEnv, 'utf8').match(/^REVALIDATE_SECRET=(.+)$/m);
  if (m) revalidate = m[1].trim();
}

function create(from, to, replacements) {
  if (existsSync(to)) {
    console.log(`· ${to} ya existe (no se toca)`);
    return;
  }
  let text = readFileSync(from, 'utf8');
  for (const [k, v] of Object.entries(replacements)) text = text.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`);
  writeFileSync(to, text);
  console.log(`✓ Creado ${to}`);
}

create('apps/api/.env.example', apiEnv, {
  JWT_SECRET: secret(),
  REVALIDATE_SECRET: revalidate,
  ADMIN_PASSWORD: secret(),
});
create('apps/web/.env.example', webEnv, { REVALIDATE_SECRET: revalidate });
