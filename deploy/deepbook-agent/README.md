# DeepBook Agent VPS Deployment

Run these workers on a separate VPS from OpenStat core. The core VPS should
keep serving the backend, worker, Postgres, Redis, and Caddy. This deployment is
only for external DeepBook Predict agent runners.

Use one Docker Compose service per OpenStat project/account. Each service gets
its own project ingestion API key, runner ID, logs, and restart lifecycle.

## Add A Project Worker

Create a project env file from the example:

```sh
cp deploy/deepbook-agent/projects/project-example.env.example deploy/deepbook-agent/projects/my-project.env
```

Set at least:

```text
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_API_KEY=ostat_project_key
DEEPBOOK_RUNNER_ID=deepbook-agent-my-project
```

Duplicate the example service in `deploy/deepbook-agent/docker-compose.yml`,
give it a unique service name, and point `env_file` at the new project env
file.

The checked-in example service marks `project-example.env` as optional so
`docker compose config` can validate before secrets exist. A real worker still
needs a real env file with `OPENSTAT_API_KEY`.

Never commit project env files. `deploy/deepbook-agent/projects/*.env` is
ignored intentionally.

## Run

From the repo root:

```sh
docker compose -f deploy/deepbook-agent/docker-compose.yml up -d --build
```

Follow logs for one project worker:

```sh
docker compose -f deploy/deepbook-agent/docker-compose.yml logs -f deepbook-agent-project-example
```

Restart after changing env:

```sh
docker compose -f deploy/deepbook-agent/docker-compose.yml up -d --build deepbook-agent-project-example
```

The worker uses `pnpm --filter deepbook-agent claim-loop`, claims queued
DeepBook runs for its project through the OpenStat API, and sends telemetry back
through the normal ingestion API.
