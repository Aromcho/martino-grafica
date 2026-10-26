# Plan y estado del proyecto

## Objetivo

Web de Martino Gráfica hecha con contenido 100 % real del Instagram @martino.grafica: portfolio filtrable, catálogo de servicios con precios publicados, cotizador que guarda el pedido y sigue por WhatsApp, y un panel para que el taller cargue todo sin depender de nadie.

## Plan seguido

1. **Relevamiento** del Instagram con el navegador: 605 publicaciones, reels, 9 historias destacadas, bio y links. Se bajaron textos, fotos y videos; se curaron a mano (sin textos encima, sin caras de clientes, sin menores, sin logos de marcas de terceros).
2. **Contenido**: 104 trabajos con título, rubro, lugar, fecha, materiales y fotos; 22 servicios en 8 rubros; 9 historias. Precios sólo donde el taller los publicó.
3. **Diseño**: concepto «plancha de vinilo» (abajo).
4. **API** NestJS + Drizzle + PostgreSQL, con optimización de fotos y revalidación al instante.
5. **Web** pública, mobile-first.
6. **Panel** `/admin`.
7. **Videos y texturas** con Kling.
8. **QA** con Playwright, build de producción, documentación y deploy.

## Concepto visual: plancha de vinilo

- **Colores del logo**: negro `#000`, lima `#C6F800` (exacto del logo) y blanco. El gris del liner `#EEF1F3` (el papel soporte del vinilo, con su grilla de cm) y el magenta `#EC008C` sólo para la línea de corte (CutContour) y el foco del teclado.
- **Elemento firma**: el logo se «plotea» al entrar. El punto blanco del logo es la cuchilla: recorre el contorno de las letras, el sobrante de vinilo se despega como un calco y el punto vuelve a su lugar. Se repite tocando el punto. Con «reducir movimiento» se muestra el logo terminado.
- **Recursos de apoyo**: marcas de registro del plotter en las fotos, esquina que se despega al pasar el mouse, grilla de liner en el cotizador (la vista previa de la medida está a escala sobre esa grilla), línea de corte punteada.
- **Tipografía**: Archivo variable (ancho 62 a 125 %): expandida y pesada para los títulos, como un rotulado; normal para el texto.

## Hecho

- [x] Web: inicio, trabajos (filtros por rubro y zona, búsqueda, carga continua), ficha de trabajo (galería con visor, anterior y siguiente, relacionados, «Pedí uno así»), servicios, ficha de servicio (calculadora con escalas de precio), cotizador, historias, el taller (contacto, mapa, horarios, consulta), buscador, 404 y errores.
- [x] Abierto ahora (se actualiza cada minuto), mapa que carga al tocarlo, WhatsApp flotante, barra inferior en el celular.
- [x] SEO: metadatos, Open Graph con imagen propia, JSON-LD, sitemap, robots, manifest e íconos.
- [x] Panel: inicio con actividad y gráfico de pedidos, pedidos (estados, precio, notas, historial, archivos, respuesta por WhatsApp editable), trabajos, servicios, rubros, historias, banners con fechas, medios con arrastrar para ordenar, horarios por temporada y feriados, datos del negocio, usuarios con roles, cambio de contraseña. Usable en el celular.
- [x] Accesibilidad: foco visible, reducir movimiento, textos alternativos, contraste, navegación con teclado.
- [x] QA: capturas de todas las páginas en celular y escritorio, cotizador de punta a punta (con archivo), panel de punta a punta (editar servicio y verlo al instante en la web, cargar y borrar trabajo, horarios, pedido). `next build` y `nest build` sin errores.
- [x] Deploy: Nginx, PM2, Certbot, backups, sin tocar otros sitios.

## Kling

188 de 300 créditos usados: 13 en imágenes (generador propio de Kling, ~1 crédito cada una: texturas y fondos) y 6 videos sin sonido de 25 créditos (portada horizontal y vertical, impresora, espátula, vinilo despegándose y holográfico).

## Falta del lado del taller (no está en Instagram, no se inventó)

1. **Horarios de atención**: no figuran en Instagram ni en Google Maps. La web dice «Horarios a confirmar» hasta que se carguen en Panel → Horarios.
2. **Medios de pago**: no publicados. Se cargan en Panel → Datos y ajustes y aparecen en «El taller».
3. **Precios** de todo lo que no sea remeras y gorras (ploteo, carteles, vidrieras, calcos, vinilos): la web dice «Presupuesto según la medida». Se pueden cargar escalas en cada servicio.
4. **Zona de colocación y costo de envío**: se tomaron las localidades donde aparecen trabajos (Villa Gesell, Mar Azul, Mar de las Pampas, Las Gaviotas, Colonia Marina, Pinamar, Cariló, Ostende) y «Calcos DTF UV y estampados con envío a todo el país». Confirmar.
5. **Dominio** de producción (para el deploy y el SEO).
6. **Logo original en vector**: se vectorizó desde la foto de perfil. Si hay un archivo original (AI, PDF, SVG), conviene reemplazarlo.
7. **Promo «20 % off»** de mayo de 2026: quedó cargada como banner apagado, para reutilizar.
