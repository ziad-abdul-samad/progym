# Infrastructure

This folder contains deployment templates for the Pro Gym architecture.

## Local database

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

## Production template

`infra/docker-compose.prod.yml` is a VPS-style template with Caddy, frontend, backend, and PostgreSQL.

Before production use:

- Replace every secret in environment files.
- Configure the real domain in `APP_DOMAIN`.
- Add automated database backups.
- Decide whether Swagger should be protected or disabled publicly.
