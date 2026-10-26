#!/usr/bin/env bash
# Actualiza Martino Gráfica en el VPS sin tocar otros sitios.
# Uso (desde la carpeta del proyecto): bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Instalando dependencias"
npm ci --no-audit --no-fund

echo "→ Compilando API y web"
npm run build

echo "→ Aplicando migraciones"
npm -w apps/api run db:migrate:prod

echo "→ Reiniciando procesos (sólo los de Martino)"
if pm2 describe martino-api >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

echo "✓ Listo. Probá: curl -sI http://127.0.0.1:3020 && curl -s http://127.0.0.1:4020/api/health"
