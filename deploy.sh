#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "Error: $SCRIPT_DIR/.env does not exist." >&2
  exit 1
fi

docker compose config --quiet

if ! docker info >/dev/null 2>&1; then
  echo "Error: cannot access the Docker daemon." >&2
  exit 1
fi

if [ ! -f traefik/acme.json ]; then
  touch traefik/acme.json
  echo "Created traefik/acme.json"
fi
chmod 600 traefik/acme.json

docker compose pull traefik app
docker compose up -d traefik postgres app

echo "Deployed. Checking status..."
docker compose ps traefik postgres app
