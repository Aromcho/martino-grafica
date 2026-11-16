#!/usr/bin/env bash
# Copia de seguridad de Martino Gráfica: base de datos + fotos + archivos de clientes.
# Guarda en /var/backups/martino y conserva los últimos 14 días.
# Cron sugerido (crontab -e):  30 3 * * * bash /root/martinografica/deploy/backup.sh >> /var/log/martino-backup.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST=/var/backups/martino
STAMP=$(date +%F-%H%M)
mkdir -p "$DEST"

docker exec martino-db-prod pg_dump -U martino -d martino --format=custom > "$DEST/db-$STAMP.dump"
# Las fotos viven donde diga UPLOADS_DIR (en el VPS: /var/www/martinografica.com/uploads, que sirve Nginx).
UPLOADS="$(sed -n 's/^UPLOADS_DIR=//p' "$ROOT/apps/api/.env" | tail -1)"
UPLOADS="$(cd "$ROOT/apps/api" && realpath "${UPLOADS:-./uploads}")"
tar -czf "$DEST/archivos-$STAMP.tar.gz" -C "$ROOT/apps/api" private -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"

find "$DEST" -type f -mtime +14 -delete
echo "✓ Backup $STAMP en $DEST"
