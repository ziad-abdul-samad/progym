# Pro Gym

Pro Gym is a single-branch gym platform built as a TypeScript monorepo.

## Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, ShadCN UI, TanStack Query, GSAP, Three.js, React Three Fiber
- Backend: NestJS, Prisma, PostgreSQL
- Package management: pnpm workspace with Turborepo

## Workspace

- `frontend/`: public website and Arabic dashboard shell
- `backend/`: NestJS API and Prisma data model
- `packages/shared/`: shared roles, status enums, API contracts, and validation helpers
- `infra/`: local and production deployment templates
- `docs/`: architecture, security, performance, SEO, and implementation standards

## Local setup

### Prerequisites

- Node.js 22+
- Corepack
- PostgreSQL 17, either through Docker or a local PostgreSQL installation

`pnpm` is declared through Corepack. If the global `pnpm` command is not available on Windows,
use `corepack pnpm` in every command below.

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Create local environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Default backend database URL:

```txt
DATABASE_URL=postgresql://progym:progym@localhost:5432/progym?schema=public
```

If your PostgreSQL runs on another port, update `backend/.env`.

The food-analysis chat supports Gemini through server-side environment variables:

```txt
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash
```

The nutrition assistant requires this key. It uses the member's profile and recent conversation as
context and does not silently fall back to a hardcoded food table.

The API key is optional. Without it, the system uses a limited local estimator and labels the
result accordingly.

### 3. Start PostgreSQL

Recommended Docker option:

```bash
docker compose -f infra/docker-compose.dev.yml up -d postgres
```

If Docker is not installed, create a PostgreSQL database and user manually:

```sql
CREATE USER progym WITH PASSWORD 'progym';
CREATE DATABASE progym OWNER progym;
```

Then make sure `backend/.env` points to that database.

### 4. Apply database schema and seed data

```bash
corepack pnpm --filter @progym/backend db:migrate
corepack pnpm --filter @progym/backend db:seed
```

Default seeded admin credentials:

```txt
username: admin
password: Admin@123456
```

Seeded demo users:

```txt
password for all demo users: Demo@123456

coaches: coach.omar, coach.karim
members: ahmad, mohammad, sami, hadi, yazan, firas
```

### 5. Run locally in development mode

Terminal 1:

```bash
corepack pnpm --filter @progym/backend dev
```

Terminal 2:

```bash
corepack pnpm --filter @progym/frontend dev
```

Open:

- Public site Arabic: `http://localhost:3000/ar`
- Public site English: `http://localhost:3000/en`
- Admin login: `http://localhost:3000/ar/login`
- Backend API: `http://localhost:4000/api/v1`
- Swagger docs: `http://localhost:4000/api/docs`

### QR testing on a phone

Do not scan a local QR that points to `localhost` from a phone. The phone will treat `localhost`
as the phone itself.

For phone testing, run the frontend on the network interface:

```bash
corepack pnpm --filter @progym/frontend dev -- --hostname 0.0.0.0
```

Then open the site with your computer LAN IP, for example:

```txt
http://192.168.1.20:3000/ar
```

Set `NEXT_PUBLIC_APP_URL` to that same LAN or tunnel URL when generating QR codes for phone scans.

### Stable preview mode

For a cleaner customer preview, run the frontend from a production build:

```bash
corepack pnpm --filter @progym/frontend build
corepack pnpm --filter @progym/frontend start
```

Keep the backend running in another terminal:

```bash
corepack pnpm --filter @progym/backend dev
```

### Useful checks

```bash
corepack pnpm --filter @progym/backend db:validate
corepack pnpm --filter @progym/backend typecheck
corepack pnpm --filter @progym/frontend typecheck
corepack pnpm --filter @progym/frontend lint
corepack pnpm --filter @progym/frontend build
```

Prompt A functional implementation is included: authentication, dashboards, memberships, QR flows, progress tracking, coaching, admin management, notifications, analytics, storage abstraction, and Prisma schema/migration.
