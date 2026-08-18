# Deployment Guide

This guide deploys One Space from Docker Hub to a server with Docker Engine.

The repository's Docker Compose stack manages Traefik, PostgreSQL, and the
application. Traefik obtains the TLS certificate and routes the configured
domain to the application container.

## Prerequisites

The server must have:

- Docker Engine and Docker Compose
- Ports 80 and 443 open to the internet
- A DNS record pointing the application domain to the server
- An SMTP endpoint and sender authorized for transactional email
- A host backup directory and a 32-byte-or-longer backup passphrase file owned by UID/GID `1001:1001`

Do not install Traefik separately. The deployment script starts the Traefik
service defined in `docker-compose.yml`.

Before the first deployment, review the ACME contact email under
`certificatesResolvers.letsencrypt.acme.email` in `traefik/traefik.yml` and
replace it if necessary. Let's Encrypt uses this address for certificate
account notices.

## 1. Configure Docker Hub publishing

Create a Docker Hub repository named `one-space`.

In the GitHub repository settings, add:

- Actions variable `DOCKERHUB_USERNAME`: your Docker Hub username
- Actions secret `DOCKERHUB_TOKEN`: a Docker Hub access token with permission
  to push the image

The CD workflow runs when a tag matching `vMAJOR.MINOR.PATCH` is pushed. It
runs CI first and publishes the image only after CI passes.

## 2. Publish a release

Commit and push the release code before creating the tag:

```sh
git push origin main
git tag v0.1.0
git push origin v0.1.0
```

For `v0.1.0`, GitHub Actions publishes these Docker Hub tags:

- `<username>/one-space:0.1.0`
- `<username>/one-space:0.1`
- `<username>/one-space:latest`
- `<username>/one-space:sha-<full-commit-sha>`

Wait for the **Publish Docker image** workflow to finish successfully before
deploying the new version.

## 3. Configure DNS

Create an `A` record that points your chosen hostname to the server's public IP
address. Create an `AAAA` record as well if the server accepts public IPv6
traffic.

Example:

```text
app.example.com -> 203.0.113.10
```

Use your own hostname. The application domain is configured later with
`APP_DOMAIN`; it is not hard-coded in the repository.

Verify DNS from your workstation:

```sh
dig +short app.example.com
```

## 4. Copy the deployment files to the server

Clone the repository on the first deployment:

```sh
sudo mkdir -p /opt/one-space
sudo chown "$USER":"$USER" /opt/one-space
git clone <github-repository-url> /opt/one-space
cd /opt/one-space
```

For later deployments, update the existing checkout:

```sh
cd /opt/one-space
git pull --ff-only
```

## 5. Create the production environment file

Create `/opt/one-space/.env`:

```dotenv
APP_IMAGE=your-dockerhub-username/one-space:0.1.0
APP_DOMAIN=app.example.com

POSTGRES_USER=one_space
POSTGRES_PASSWORD=replace-with-a-strong-password
POSTGRES_DB=one_space

DATABASE_URL=postgres://one_space:replace-with-a-strong-password@postgres:5432/one_space
APP_ORIGIN=https://app.example.com
TOKEN_ENCRYPTION_KEY=replace-with-64-random-hex-characters
RATE_LIMIT_HASH_KEY=replace-with-an-independent-random-secret
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=replace-with-a-stable-random-secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_FROM=One Space <no-reply@example.com>
SMTP_USER=
SMTP_PASS=

INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=replace-with-a-policy-compliant-password
INITIAL_ADMIN_FIRST_NAME=Initial
INITIAL_ADMIN_LAST_NAME=Admin

AVATAR_STORAGE_PATH=/var/lib/one-space/avatars
BACKUP_ENCRYPTION_KEY_FILE=/run/secrets/one-space-backup-key
BACKUP_ENCRYPTION_KEY_FILE_HOST=/opt/one-space/secrets/backup.key
BACKUP_DIR_HOST=/opt/one-space/backups
```

`APP_DOMAIN` must be a hostname only. Do not include `https://`, a port, a path,
or a trailing slash.

Use a versioned image tag instead of `latest` so the deployed artifact is
explicit and rollback remains predictable.

Protect the environment file:

```sh
chmod 600 /opt/one-space/.env
```

Create the operations paths without placing the encryption key in the repository:

```sh
install -d -m 700 -o 1001 -g 1001 /opt/one-space/backups /opt/one-space/secrets
openssl rand -base64 48 | install -m 600 -o 1001 -g 1001 /dev/stdin /opt/one-space/secrets/backup.key
```

Keep `TOKEN_ENCRYPTION_KEY`, `RATE_LIMIT_HASH_KEY`, and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` stable across deployments. Rotating the token-encryption key invalidates outstanding invitation and password-reset links. Remove the `INITIAL_ADMIN_*` values after the first Admin is created; startup refuses an empty database without them and refuses an existing database with no active Admin.

## 6. Authenticate to Docker Hub

Skip this step if the Docker Hub repository is public. For a private repository,
log in with a read-only Docker Hub access token:

```sh
docker login --username your-dockerhub-username
```

Enter the access token when Docker asks for the password.

## 7. Deploy the application

Run the deployment script:

```sh
cd /opt/one-space
./deploy.sh
```

The script:

- Validates `.env` and the Compose configuration
- Verifies access to the Docker daemon
- Creates `traefik/acme.json` with permissions required by Traefik
- Pulls the Traefik and configured application images
- Starts or updates `traefik`, `postgres`, and `app`

The application runs committed Drizzle migrations before its startup Admin invariant check. A migration or invariant failure keeps the new application container unhealthy instead of serving against an incompatible schema. Back up before deployment and inspect application logs for migration completion or failure.

## 8. Verify the deployment

Inspect the application and Traefik logs:

```sh
docker compose logs --tail=100 app
docker compose logs --tail=100 traefik
```

Verify the public endpoint:

```sh
curl -fsSI https://app.example.com/
curl -fsS https://app.example.com/api/health
```

Replace `app.example.com` with the value of `APP_DOMAIN`.

If HTTPS does not work, verify that:

- DNS resolves to this server
- Ports 80 and 443 are reachable
- No other service is already using ports 80 or 443
- `traefik/acme.json` exists and has mode `600`
- The application container is running and listening on port 3000

## Deploy a new version

After publishing another release tag, update `APP_IMAGE` in `.env` and redeploy
the stack:

```sh
cd /opt/one-space
./deploy.sh
docker compose logs --tail=100 app
```

Run a coordinated encrypted database/avatar backup before and after the rollout:

```sh
docker compose --profile operations run --rm backup
```

The command writes an encrypted snapshot, manifest, and ciphertext checksum beneath `BACKUP_DIR_HOST`. It retains daily artifacts for 30 days. Schedule it at least daily with the host scheduler and alert on non-zero exit.

## Roll back

Change `APP_IMAGE` in `.env` to the previous version or its immutable
`sha-<full-commit-sha>` tag, then recreate the application container:

```sh
cd /opt/one-space
./deploy.sh
docker compose logs --tail=100 app
```

Rollback changes only the application image. The named `avatar_data` and `postgres_data` volumes remain attached and are never replaced by a release checkout. Do not roll back across an incompatible database migration until the release-specific data rollback procedure has been reviewed and tested.

## Isolated restore exercise

At least quarterly, restore the database and avatar archive together into an isolated production-like database and empty avatar directory. Never point the restore service at the source database or live avatar directory.

1. Start an isolated PostgreSQL target on the internal network and create an empty database.
2. Set `RESTORE_DATABASE_URL`, `RESTORE_SNAPSHOT_FILE`, `RESTORE_AVATAR_STORAGE_PATH_HOST`, and `ALLOW_ISOLATED_RESTORE=yes` only for the exercise.
3. Ensure the restore avatar directory is empty and owned by UID/GID `1001:1001`.
4. Run `docker compose --profile operations run --rm restore`.
5. Start the application against the restored database/avatar directory and exercise login, directory, profile, and avatar reads.
6. Record snapshot ID, image SHA tag, operator, date, checksum result, reference mismatches, application checks, and cleanup.

`ops/verify-restore.sh` reports missing referenced files; the application returns its default-avatar outcome for those records. A script test or checksum-only run is not a production-like restore exercise.

## Production notes

- PostgreSQL is reachable only on the internal Compose network; do not add a host port mapping.
- Avatar files live on the named `avatar_data` volume outside release directories. The `avatar-init` one-shot service establishes runtime ownership before the app starts.
- Monitor backup exit status, backup age, disk capacity, `/api/health`, SMTP degradation, and operations audit events. Test alert delivery rather than inferring it from configuration.
- Back up `traefik/acme.json` securely. It contains ACME account and certificate
  data and must not be committed to Git.
- Keep Docker Hub deployment credentials read-only on the server. The server
  needs permission to pull images, not publish them.

This guide and static Compose validation do not prove live HTTPS cookie behavior, SMTP acceptance/recovery, Docker volume persistence through an actual redeploy, backup creation, alert delivery, or isolated restoration. Production readiness requires separately recorded live evidence for each category.
