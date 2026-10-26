# Martino Gráfica

Sitio web, cotizador y panel de gestión de **Martino Gráfica** (Villa Gesell): ploteo vehicular y de motos, cartelería, vidrieras, calcos, vinilo decorativo, remeras y gorras.

- **apps/web**: Next.js 16 (App Router) + Tailwind 4 + motion. La web pública y el panel `/admin`.
- **apps/api**: NestJS 11 + Drizzle + PostgreSQL. API, subida y optimización de fotos (sharp), pedidos y autenticación.
- **apps/api/seed**: todo el contenido relevado del Instagram (104 trabajos, 22 servicios, 8 rubros, 9 historias destacadas, 592 fotos).

## Requisitos (Windows)

1. **Node.js 20.18 o más nuevo** (recomendado 22 LTS): https://nodejs.org
2. **Docker Desktop**, para la base de datos: https://www.docker.com/products/docker-desktop. Abrilo una vez y esperá a que diga «Engine running».
3. Git (opcional).

> Sin Docker: instalá PostgreSQL 16, creá la base `martino` con usuario `martino` y contraseña `martino`, y cambiá el puerto en `DATABASE_URL` de `apps/api/.env` (5432 si es el estándar). Después corré `npm run setup` igual: el paso de Docker va a fallar, así que usá `npm run env`, `npm run db:migrate` y `npm run seed` por separado.

## Instalación

En PowerShell, dentro de la carpeta del proyecto:

```powershell
npm install
npm run setup
npm run dev
```

`npm run setup` hace todo de una vez:

1. crea `apps/api/.env` y `apps/web/.env.local` con secretos aleatorios (no pisa los que ya existen),
2. levanta PostgreSQL en Docker (puerto **5433**, para no chocar con otro Postgres),
3. aplica las migraciones,
4. carga el contenido y optimiza las 592 fotos (WebP en 480, 960 y 1600 px + placeholder borroso). Tarda 1 o 2 minutos.

Después:

- Web: http://localhost:3000
- Panel: http://localhost:3000/admin
- API y documentación: http://localhost:4000/api/docs

## Usuario del panel

El email inicial es `admin@martinografica.com.ar`. La contraseña aleatoria se genera durante `npm run setup` y queda guardada en `apps/api/.env` como `ADMIN_PASSWORD`. Cambiala al entrar (Panel → Datos y ajustes → Tu contraseña). Desde **Usuarios** se crean editores: cargan contenido y atienden pedidos, pero no cambian datos del negocio ni usuarios.


## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | API y web en modo desarrollo (se recargan solas) |
| `npm run build` | Compila API y web para producción |
| `npm start` | Corre lo compilado (API :4000, web :3000) |
| `npm run setup` | Primera instalación completa |
| `npm run seed:reset` | Borra el contenido y lo vuelve a cargar desde el seed (no toca los pedidos) |
| `npm run db:down` | Apaga la base de Docker (los datos quedan guardados) |
| `npm run typecheck` | Revisa tipos de API y web |

## Cómo está armado

- **Revalidación al instante**: cada vez que el panel guarda algo, la API avisa a Next (`/revalidate`, con secreto compartido) qué etiquetas refrescar (`business`, `catalog`, `works`, `content`). La web muestra el cambio en el siguiente pedido, sin esperar.
- **Cotizador** (`/cotizar`): servicio, medida con vista previa a escala, cantidad con escalas de precio, material, terminación, diseño con hasta 5 archivos de 25 MB, entrega y datos. Guarda el pedido en el panel y abre WhatsApp con el mensaje armado. Acepta `?servicio=slug&cantidad=N&trabajo=slug`.
- **Archivos de clientes**: se guardan en `apps/api/private` (no son públicos) y se descargan sólo desde el panel con sesión.
- **Fotos del panel**: se suben a `apps/api/uploads`, se optimizan y quedan en la biblioteca de medios.
- **Horarios**: no están publicados en Instagram. Mientras no se carguen (Panel → Horarios), la web dice «Horarios a confirmar» y ofrece consultar por WhatsApp. Al cargarlos aparece «Abierto ahora / Cerrado» y se publican en los datos estructurados para Google.
- **SEO**: metadatos por página, Open Graph, JSON-LD (`LocalBusiness`, `Product`, `CreativeWork`, `BreadcrumbList`, `OfferCatalog`), `sitemap.xml`, `robots.txt`, manifest e íconos.

## Estructura

```
apps/
  api/            NestJS: src/{auth,catalog,works,content,quotes,business,media,stats,search,...}
    drizzle/      migraciones SQL
    seed/         content.json + fotos del relevamiento
  web/            Next.js: src/app/(site) (web), src/app/admin (panel), src/components
deploy/           Nginx, PM2, deploy.sh, backup.sh y guía para el VPS
docker-compose.yml        Postgres de desarrollo (5433)
docker-compose.prod.yml   Postgres de producción (127.0.0.1:5435)
```

## Producción

Ver [deploy/DEPLOY.md](deploy/DEPLOY.md): VPS de Hostinger con Nginx y Certbot, sin tocar los sitios que ya están.
