#!/bin/sh
set -eu

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${RESTORE_AVATAR_STORAGE_PATH:?RESTORE_AVATAR_STORAGE_PATH is required}"

mismatches=0
references="$(mktemp "${TMPDIR:-/tmp}/one-space-avatar-references.XXXXXX")"
cleanup() {
  rm -f -- "$references"
}
trap cleanup EXIT INT TERM
psql "$RESTORE_DATABASE_URL" --no-align --tuples-only --command='select avatar_key from users where avatar_key is not null order by avatar_key' > "$references"
while IFS= read -r avatar_key; do
  case "$avatar_key" in
    *.jpg|*.png) ;;
    *)
      printf 'invalid avatar_key reference: %s\n' "$avatar_key" >&2
      mismatches=$((mismatches + 1))
      continue
      ;;
  esac
  if [ ! -f "$RESTORE_AVATAR_STORAGE_PATH/$avatar_key" ]; then
    printf 'missing avatar_key reference: %s; application will use default avatar\n' "$avatar_key" >&2
    mismatches=$((mismatches + 1))
  fi
done < "$references"

if [ "$mismatches" -ne 0 ]; then
  exit 1
fi
printf '%s\n' 'Restore reference verification passed.'
