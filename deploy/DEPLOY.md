# Deploy en el VPS (Hostinger, Nginx + Certbot)

Todo es propio de Martino y no toca los sitios que ya están en el servidor:

| Pieza | Valor | Para qué |
|---|---|---|
| Carpeta | `/var/www/martinografica` | el proyecto |
| Web (Next) | `127.0.0.1:3020` | sólo accesible desde Nginx |
| API (Nest) | `127.0.0.1:4020` | sólo accesible desde Nginx |
| PostgreSQL | Docker `martino-db-prod`, `127.0.0.1:5435` | base propia |
| PM2 | `martino-api`, `martino-web` | procesos propios |
| Nginx | `/etc/nginx/sites-available/martinografica` | server block propio |

Antes de empezar, confirmá que esos puertos están libres: `ss -ltnp | grep -E ':(3020|4020|5435)\b'` no tiene que mostrar nada. Si alguno está ocupado, cambialo en `ecosystem.config.cjs`, en los `.env` y en `nginx.conf.template`.

## 1. DNS

En el panel del dominio, registros **A** para `tudominio` y `www.tudominio` apuntando a la IP del VPS.

## 2. Requisitos del servidor (si ya están, saltealo)

```bash
node -v      # 20.18 o más (recomendado 22)
pm2 -v       # npm i -g pm2
docker -v    # y docker compose
nginx -v
certbot --version
```

## 3. Subir el proyecto

```bash
sudo mkdir -p /var/www/martinografica && sudo chown $USER: /var/www/martinografica
# Desde tu PC (o con git clone):
scp -r MartinoGrafica/* usuario@IP:/var/www/martinografica/
cd /var/www/martinografica
```

## 4. Base de datos

```bash
cp deploy/.env.db.example deploy/.env.db
nano deploy/.env.db            # poné una contraseña larga
docker compose --env-file deploy/.env.db -f docker-compose.prod.yml up -d
```

## 5. Variables de entorno

```bash
npm run env                    # crea apps/api/.env y apps/web/.env.local con secretos
nano apps/api/.env
```

En `apps/api/.env` cambiá:

```
DATABASE_URL="postgresql://martino:LA_CONTRASEÑA@127.0.0.1:5435/martino"
NODE_ENV=production
HOST=127.0.0.1
PORT=4020
CORS_ORIGINS=https://tudominio
PUBLIC_SITE_URL=https://tudominio
WEB_INTERNAL_URL=http://127.0.0.1:3020
COOKIE_SECURE=true
ADMIN_PASSWORD=una-contraseña-nueva
```

En `apps/web/.env.local`:

```
API_URL=http://127.0.0.1:4020
NEXT_PUBLIC_SITE_URL=https://tudominio
```

(`REVALIDATE_SECRET` ya quedó igual en los dos archivos.)

## 6. Instalar, compilar y cargar el contenido

```bash
npm ci
npm run build                          # NEXT_PUBLIC_SITE_URL tiene que estar bien ANTES de compilar
npm -w apps/api run db:migrate:prod
npm -w apps/api run seed:prod          # crea el admin y carga trabajos, servicios y fotos
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup                            # si todavía no estaba configurado (seguí la instrucción que imprime)
curl -s http://127.0.0.1:4020/api/health && curl -sI http://127.0.0.1:3020 | head -1
```

## 7. Nginx (un archivo nuevo, sin tocar los otros)

```bash
sed -e 's/__DOMINIO__/tudominio/g' -e 's#__RUTA__#/var/www/martinografica#g' deploy/nginx.conf.template | sudo tee /etc/nginx/sites-available/martinografica
sudo ln -s /etc/nginx/sites-available/martinografica /etc/nginx/sites-enabled/martinografica
sudo nginx -t && sudo systemctl reload nginx      # reload, no restart: los otros sitios siguen sirviendo
```

Nginx sirve `/uploads` directo del disco: el usuario de Nginx (`www-data`) necesita leer `apps/api/uploads` (`chmod o+rx` en las carpetas del camino si hiciera falta).

## 8. HTTPS con Certbot (sólo este dominio)

```bash
sudo certbot --nginx -d tudominio -d www.tudominio
```

Certbot edita únicamente el archivo `martinografica` y agrega la redirección a HTTPS. La renovación automática ya la maneja el timer de Certbot que usan los otros sitios.

## 9. Copias de seguridad

```bash
crontab -e
30 3 * * * bash /var/www/martinografica/deploy/backup.sh >> /var/log/martino-backup.log 2>&1
```

Guarda la base, las fotos y los archivos de clientes en `/var/backups/martino` (14 días). Para restaurar la base:
`docker exec -i martino-db-prod pg_restore -U martino -d martino --clean < /var/backups/martino/db-FECHA.dump`

## Actualizaciones

```bash
cd /var/www/martinografica
# subí los archivos nuevos (o git pull)
bash deploy/deploy.sh
```

`deploy.sh` instala, compila, migra y recarga sólo `martino-api` y `martino-web`.

## Si algo no anda

- `pm2 logs martino-api --lines 80` / `pm2 logs martino-web --lines 80`
- `sudo tail -f /var/log/nginx/martino.error.log`
- El panel no deja entrar en HTTPS: revisá `COOKIE_SECURE=true` y que entres por `https://`.
- Lo que guardás en el panel tarda en verse: `REVALIDATE_SECRET` distinto entre API y web, o `WEB_INTERNAL_URL` mal.
