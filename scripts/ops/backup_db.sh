#!/bin/bash
# --- ITEM 145: PRODUCTION-GRADE BACKUP STRATEGY ---
# Performs compressed PG dumps and enforces retention.

BACKUP_DIR="/home/matt/household-project/server/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="hearthstone_prod_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "💾 Starting database backup: $FILENAME"

# 1. Perform Dump inside the container and pipe to gzip
docker compose exec -t db pg_dump -U hearth_user hearthstone | gzip > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_DIR/$FILENAME"
else
    echo "❌ Backup failed!"
    exit 1
fi

# 2. Enforce Retention
echo "🧹 Purging backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "hearthstone_prod_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "🏁 Backup task complete."
