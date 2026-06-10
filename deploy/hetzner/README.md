# OpenStat Hetzner Deployment

This deploys the API, ingestion worker, Postgres, Redis, and Caddy on one
Hetzner VPS. The web dashboard can stay on Vercel and point to `API_PUBLIC_URL`.

## Target VPS

Use the upgraded single-node deployment for OpenStat core services:

```text
4 vCPU
8 GB RAM
80 GB SSD
20 TB traffic
```

Keep this VPS focused on the OpenStat control plane:

- backend API
- ingestion worker
- Postgres
- Redis
- Caddy

Do not colocate model workers, browser automation, high-volume agent execution,
custom indexing services, or long-running strategy search jobs on this box. Run
those from a laptop, a second VPS, or a temporary worker host and send telemetry
to `API_PUBLIC_URL` with an OpenStat project API key.

Suggested starting budget:

| Service                | Starting Budget               | Notes                                                           |
| ---------------------- | ----------------------------- | --------------------------------------------------------------- |
| Postgres               | 3-4 GB RAM, persistent volume | Primary state store; watch disk and backup age.                 |
| Backend API            | 512 MB-1 GB RAM               | Keep HTTP request bodies bounded by `INGESTION_MAX_BODY_BYTES`. |
| Worker                 | 512 MB-1 GB RAM               | Tune `INGESTION_WORKER_BATCH_SIZE` before adding replicas.      |
| Redis                  | 768 MB RAM                    | Compose sets `maxmemory=768mb` and `volatile-lru`.              |
| Caddy                  | 128-256 MB RAM                | Public ingress only; Postgres/Redis stay private.               |
| OS and Docker overhead | 1-2 GB RAM                    | Leave enough headroom for deploys and backups.                  |

Scale away from this node before adding high-volume agent execution, local LLM
inference, or custom archive/indexing workloads.

## First Boot

1. Provision a Hetzner VPS with Docker and the Docker Compose plugin.
2. Point the API domain A record at the VPS public IP.
3. Copy `.env.example` to `.env` and replace every secret.
4. Open only SSH, HTTP, and HTTPS in the firewall.
5. Keep Postgres and Redis private to the Docker network. Do not publish ports
   `5432` or `6379`.
6. Start the stack:

```sh
docker compose -f deploy/hetzner/docker-compose.yml --env-file deploy/hetzner/.env up -d --build
```

7. Run migrations:

```sh
docker compose -f deploy/hetzner/docker-compose.yml --env-file deploy/hetzner/.env run --rm api pnpm --filter @openstat/db db:migrate
```

8. Check health:

```sh
curl https://api.openstat.example.com/health
curl https://api.openstat.example.com/ready
deploy/hetzner/scripts/check-openstat.sh
```

Before opening early access, complete
`deploy/hetzner/LAUNCH_CHECKLIST.md`.

## Vercel

Set `NEXT_PUBLIC_OPENSTAT_API_URL` to the API domain, for example
`https://api.openstat.example.com`.

## GitHub Actions Deploy

The repository includes `.github/workflows/deploy-hetzner.yml`. It deploys the
backend stack when `main` is pushed, after typecheck and lint pass.

Add these repository secrets in GitHub:

```text
HETZNER_HOST=37.27.196.51
HETZNER_USER=deploy
HETZNER_SSH_KEY=<private SSH key allowed for deploy@37.27.196.51>
HETZNER_REPO_DIR=/home/deploy/openstat
```

The deploy job updates the VPS checkout to `origin/main`, builds the API and
worker images, runs database migrations, restarts the Compose stack, and checks
the backend readiness endpoint from inside the API container.

## Future Two-VPS Split

When the database outgrows the single VPS, move Postgres to a second Hetzner VPS
on the private network only. Bind Postgres to the private interface, allow
`5432` only from the API/worker VPS private IP, update `DATABASE_URL`, and keep
public firewall access denied.

## Rollback

1. Keep the previous image available before pulling new changes.
2. If deploy fails, revert the Git SHA and rebuild:

```sh
git checkout <previous-sha>
docker compose -f deploy/hetzner/docker-compose.yml --env-file deploy/hetzner/.env up -d --build api worker
```

3. If a migration already ran, restore from the latest backup before restarting
   the old app version.
