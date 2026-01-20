#!/bin/sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/data/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-15}
MAX_FILES=${BACKUP_MAX_FILES:-30}

DB_URL=${DATABASE_URL_UNPOOLED:-${NEON_DATABASE_URL:-${DATABASE_URL:-}}}

if [ -z "${DB_URL}" ]; then
  echo "DATABASE_URL_UNPOOLED (prefer) or NEON_DATABASE_URL is required" >&2
  exit 1
fi

case "${DB_URL}" in
  *pooler*|*pgbouncer*)
    echo "WARNING: Use an unpooled connection string for pg_dump." >&2
    ;;
  *)
    ;;
esac

mkdir -p "${BACKUP_DIR}"

DATE=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILE="${BACKUP_DIR}/neon-backup-${DATE}.dump"

printf "Creating backup: %s\n" "${FILE}"
pg_dump -Fc -v -d "${DB_URL}" -f "${FILE}"

# Remove files older than retention window
MAX_AGE=$((RETENTION_DAYS - 1))
if [ "${MAX_AGE}" -ge 0 ]; then
  find "${BACKUP_DIR}" -type f -name "*.dump" -mtime "+${MAX_AGE}" -print -delete || true
fi

# Enforce max file count (delete oldest first)
COUNT=$(ls -1 "${BACKUP_DIR}"/*.dump 2>/dev/null | wc -l | tr -d ' ')
if [ "${COUNT}" -gt "${MAX_FILES}" ]; then
  ls -1t "${BACKUP_DIR}"/*.dump | tail -n "+$((MAX_FILES + 1))" | while read -r f; do
    rm -f "${f}"
  done
fi

printf "Backup complete. Total files: %s\n" "$(ls -1 "${BACKUP_DIR}"/*.dump 2>/dev/null | wc -l | tr -d ' ')"