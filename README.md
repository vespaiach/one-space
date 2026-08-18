# Introduction

A self-hosted, lightweight work tracker for a single team — think of it as a
minimal Linear clone. It gives a small team one place to plan projects, track
issues on a live board, and manage who's on the team, without the operational
weight of a large SaaS platform.

The product is built around one guiding principle: **minimize build and
maintenance cost**. Every capability is intentionally scoped small so the whole
system runs on a single server with the smallest viable footprint.

## What it does

### Project management

Organize work into projects. Each project holds its own specs, milestones, and a
roadmap so the team can capture what's being built and track progress toward it.

### Issue & task management

A Trello-style board with columns and draggable cards. Issues carry titles,
descriptions, assignees, priorities, labels, and comments. Card moves are
**live** — teammates viewing the same board see updates within about a second.

### Member management

Invite teammates by email, assign roles (admin or member), and manage access.
Admins handle invitations, role changes, and suspending or removing members;
everyone else works within the project and board they belong to.

## What it deliberately is not

These limits are choices, not gaps. They keep the system small, cheap, and easy
to operate.

1. **Single workspace, single team.** One workspace and one team, seeded at
   setup. No multi-tenancy, no team switching.
2. **Small workloads.** Designed for a small team (fewer than ~20 people) and the
   modest amount of data that produces. It is not tuned for large-scale usage.
3. **Single point of failure.** Runs as one instance with no high-availability
   or redundancy. A restart or deploy causes a few seconds of downtime, after
   which clients reconnect automatically.
4. **Scaling is out of scope.** No horizontal scaling, no Redis, no load
   balancing. Growing beyond a single team's needs is explicitly a non-goal.

## Who it's for

A single small team that wants Linear-style project and issue tracking they can
run and own themselves, and who value simplicity and low running cost over
scale, redundancy, and multi-tenant flexibility.

---

For the full technical specification — architecture, data model, security, and
operations — see [specs folder](./specs).

## Publishing Docker images

The `Publish Docker image` GitHub Actions workflow runs CI, then builds and
publishes a multi-platform image to Docker Hub when a semantic version tag is
pushed. The image is not published if CI fails.

Before the first release:

1. Create a Docker Hub repository named `one-space`.
2. In the GitHub repository's Actions settings, add a repository variable named
   `DOCKERHUB_USERNAME` with the Docker Hub account or organization name.
3. Add a repository secret named `DOCKERHUB_TOKEN` containing a Docker Hub
   personal access token with permission to push to that repository.

Publish a release by pushing a tag in the `vMAJOR.MINOR.PATCH` format:

```sh
git tag v0.1.0
git push origin v0.1.0
```

For `v0.1.0`, the workflow publishes `<username>/one-space` with the tags
`0.1.0`, `0.1`, `latest`, and `sha-<full-commit-sha>` for immutable rollbacks.

## Deploying a published image

Traefik is included in the Docker Compose stack. Follow the complete
[deployment guide](./DEPLOYMENT.md) to configure DNS, environment variables,
TLS, and the first deployment.

On the server, create `.env` with the image version and database credentials:

```dotenv
APP_IMAGE=<username>/one-space:0.1.0
APP_DOMAIN=<your-domain>
POSTGRES_USER=one_space
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=one_space
```

If the Docker Hub repository is private, log in with a read-only access token:

```sh
docker login --username <username>
```

Deploy the configured image:

```sh
./deploy.sh
docker compose logs --tail=100 app
curl -fsS https://<your-domain>/
```

For each release, update `APP_IMAGE` to the new version and run `./deploy.sh`
again. Use a version tag rather than `latest` so the deployed artifact is
explicit. To roll back, restore the previous version or immutable
`sha-<full-commit-sha>` tag in `APP_IMAGE` and rerun the script.
