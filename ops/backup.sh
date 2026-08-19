#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AVATAR_STORAGE_PATH:?AVATAR_STORAGE_PATH is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${BACKUP_ENCRYPTION_KEY_FILE:?BACKUP_ENCRYPTION_KEY_FILE is required}"

umask 077
mkdir -p "$BACKUP_DIR"
snapshot_id="$(date -u +%Y%m%dT%H%M%SZ)"
staging="$(mktemp -d "${TMPDIR:-/tmp}/one-space-backup.XXXXXX")"
cleanup() {
  rm -rf -- "$staging"
}
trap cleanup EXIT INT TERM

pg_dump --dbname="$DATABASE_URL" --format=custom --file="$staging/database.dump"
tar --create --gzip --file="$staging/avatars.tar.gz" --directory="$AVATAR_STORAGE_PATH" .
(
  cd "$staging"
  sha256sum database.dump avatars.tar.gz > manifest.sha256
  printf 'snapshot_id=%s\ncreated_at=%s\nretention_days=30\n' "$snapshot_id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > manifest.txt
  tar --create --file=snapshot.tar database.dump avatars.tar.gz manifest.sha256 manifest.txt
)
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass "file:$BACKUP_ENCRYPTION_KEY_FILE" \
  -in "$staging/snapshot.tar" \
  -out "$BACKUP_DIR/one-space-$snapshot_id.tar.enc"
sha256sum "$BACKUP_DIR/one-space-$snapshot_id.tar.enc" > "$BACKUP_DIR/one-space-$snapshot_id.tar.enc.sha256"
find "$BACKUP_DIR" -type f -name 'one-space-*.tar.enc*' -mtime +30 -delete
printf '%s\n' "$BACKUP_DIR/one-space-$snapshot_id.tar.enc"
