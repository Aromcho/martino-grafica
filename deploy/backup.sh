#!/usr/bin/env bash
# Copia de seguridad de Martino Gráfica: base de datos + fotos + archivos de clientes.
# Guarda en /var/backups/martino y conserva los últimos 14 días.
# Cron sugerido (crontab -e):  30 3 * * * bash /var/www/martinografica/deploy/backup.sh >> /var/log/martino-backup.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST=/var/backups/martino
STAMP=$(date +%F-%H%M)
mkdir -p "$DEST"

docker exec martino-db-prod pg_dump -U martino -d martino --format=custom > "$DEST/db-$STAMP.dump"
tar -czf "$DEST/archivos-$STAMP.tar.gz" -C "$ROOT/apps/api" uploads private

find "$DEST" -type f -mtime +14 -delete
echo "✓ Backup $STAMP en $DEST"
