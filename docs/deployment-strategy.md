# Deployment Strategy

## Local development

- Use `infra/docker-compose.dev.yml` for PostgreSQL.
- Run frontend and backend dev servers directly through pnpm.
- Use `.env.example` files as the source for required environment variables.

## Production

- Use Dockerized services for `frontend`, `backend`, `postgres`, and `caddy`.
- Caddy handles TLS and reverse proxying.
- Backend runs Prisma migrations before release startup in the deployment pipeline.
- PostgreSQL data is persisted in a named volume.
- Nightly backups should be stored outside the application host and periodically restore-tested.

## CI

CI should run:

- Install dependencies
- Prisma schema validation
- Typecheck
- Lint
- Tests
- Production builds

No deployment should proceed unless schema validation, typecheck, tests, and builds pass.
