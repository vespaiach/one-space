#!/bin/sh
set -e

# Create acme.json on first deploy (Traefik requires it to exist with 600 perms)
if [ ! -f traefik/acme.json ]; then
  touch traefik/acme.json
  chmod 600 traefik/acme.json
  echo "Created traefik/acme.json"
fi

docker compose pull traefik
docker compose build --no-cache app
docker compose up -d --remove-orphans

echo "Deployed. Checking status..."
docker compose ps
