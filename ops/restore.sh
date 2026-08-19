#!/bin/sh
set -eu

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${RESTORE_AVATAR_STORAGE_PATH:?RESTORE_AVATAR_STORAGE_PATH is required}"
: "${SNAPSHOT_FILE:?SNAPSHOT_FILE is required}"
: "${BACKUP_ENCRYPTION_KEY_FILE:?BACKUP_ENCRYPTION_KEY_FILE is required}"
: "${ALLOW_ISOLATED_RESTORE:?Set ALLOW_ISOLATED_RESTORE=yes for an isolated target}"

if [ "$ALLOW_ISOLATED_RESTORE" != "yes" ]; then
  printf '%s\n' 'Restore refused: ALLOW_ISOLATED_RESTORE must equal yes.' >&2
  exit 2
fi
if [ "${DATABASE_URL:-}" = "$RESTORE_DATABASE_URL" ] || [ "${AVATAR_STORAGE_PATH:-}" = "$RESTORE_AVATAR_STORAGE_PATH" ]; then
  printf '%s\n' 'Restore refused: target must differ from the source environment.' >&2
  exit 2
fi
if [ -e "$RESTORE_AVATAR_STORAGE_PATH" ] && [ "$(find "$RESTORE_AVATAR_STORAGE_PATH" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  printf '%s\n' 'Restore refused: avatar target directory must be empty.' >&2
  exit 2
fi

umask 077
staging="$(mktemp -d "${TMPDIR:-/tmp}/one-space-restore.XXXXXX")"
cleanup() {
  rm -rf -- "$staging"
}
trap cleanup EXIT INT TERM

openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass "file:$BACKUP_ENCRYPTION_KEY_FILE" \
  -in "$SNAPSHOT_FILE" \
  -out "$staging/snapshot.tar"
tar --extract --file="$staging/snapshot.tar" --directory="$staging"
(
  cd "$staging"
  sha256sum --check manifest.sha256
)
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner "$staging/database.dump"
mkdir -p "$RESTORE_AVATAR_STORAGE_PATH"
tar --extract --gzip --file="$staging/avatars.tar.gz" --directory="$RESTORE_AVATAR_STORAGE_PATH"
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
RESTORE_AVATAR_STORAGE_PATH="$RESTORE_AVATAR_STORAGE_PATH" \
  "$(dirname "$0")/verify-restore.sh"
