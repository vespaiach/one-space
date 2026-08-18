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
```

`APP_DOMAIN` must be a hostname only. Do not include `https://`, a port, a path,
or a trailing slash.

Use a versioned image tag instead of `latest` so the deployed artifact is
explicit and rollback remains predictable.

Protect the environment file:

```sh
chmod 600 /opt/one-space/.env
```

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

## 8. Verify the deployment

Inspect the application and Traefik logs:

```sh
docker compose logs --tail=100 app
docker compose logs --tail=100 traefik
```

Verify the public endpoint:

```sh
curl -fsSI https://app.example.com/
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

## Roll back

Change `APP_IMAGE` in `.env` to the previous version or its immutable
`sha-<full-commit-sha>` tag, then recreate the application container:

```sh
cd /opt/one-space
./deploy.sh
docker compose logs --tail=100 app
```

## Production notes

- The current Compose file publishes PostgreSQL on host port 5432. Remove that
  port mapping or block port 5432 with the server firewall before production.
- Back up the `postgres_data` Docker volume regularly and test restoration.
- Back up `traefik/acme.json` securely. It contains ACME account and certificate
  data and must not be committed to Git.
- The runtime image does not currently include a database migration command.
  Database schema changes require a separate migration procedure before the new
  application version can be considered deployed.
- Keep Docker Hub deployment credentials read-only on the server. The server
  needs permission to pull images, not publish them.
