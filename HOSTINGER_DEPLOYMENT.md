# Hostinger Business deployment

The Business plan can run this repository as two managed Node.js web apps. Both apps use the
repository root so pnpm workspace dependencies remain available.

## 1. Frontend web app

- Domain: `example.com`
- Framework: Next.js
- Node.js: 22
- Root directory: repository root
- Build command: `pnpm hostinger:build:frontend`
- Start command: `pnpm hostinger:start:frontend`
- Output directory: `frontend/.next`

Environment variables:

```txt
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
API_PROXY_TARGET=https://api.example.com/api/v1
```

The browser intentionally calls `/api/v1` on the frontend domain. Next.js securely proxies those
requests to the backend using `API_PROXY_TARGET`, preserving the existing authentication cookies.

## 2. Backend web app

- Domain: `api.example.com`
- Framework: NestJS
- Node.js: 22
- Root directory: repository root
- Build command: `pnpm hostinger:build:backend`
- Start command: `pnpm hostinger:start:backend`
- Output directory: `backend/dist`

Environment variables:

```txt
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
FRONTEND_ORIGINS=https://example.com,https://www.example.com
JWT_ACCESS_SECRET=generate-a-long-random-secret
JWT_REFRESH_SECRET=generate-a-different-long-random-secret
JWT_RESET_SECRET=generate-a-third-long-random-secret
COOKIE_DOMAIN=.example.com
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=use-a-strong-password
SEED_DEMO_DATA=false
FILE_STORAGE_MODE=filesystem
UPLOAD_ROOT=/home/u12345678/domains/api.example.com/private_uploads
```

Replace the example domain, home directory, secrets, and database URL. The exact `/home/u...` path
is visible in Hostinger File Manager or FTP Accounts. Keep `UPLOAD_ROOT` outside the generated
`nodejs` build directory so a GitHub redeployment cannot replace member uploads.

`FILE_STORAGE_MODE` supports:

- `filesystem`: Hostinger production mode. New images use hosting disk only.
- `database`: Store image bytes only in PostgreSQL.
- `hybrid`: Store both a local copy and a database fallback. This remains the default for existing
  Vercel/Render compatibility.

Existing database-backed images remain readable after switching to `filesystem`; only new uploads
stop consuming PostgreSQL storage.

## 3. Database migration

The backend start command applies committed Prisma migrations automatically. Before pointing the
public domain to Hostinger, take a Neon snapshot and verify that the deployment applied the latest
migration successfully.

## 4. Persistent upload backup

Hostinger disk is the primary copy in `filesystem` mode. Include the `private_uploads` directory in
regular Hostinger backups and download an off-site backup periodically. Never expose the directory
as a public static folder: files must continue to pass through the protected `/api/v1/files/:id`
endpoint.

## 5. Verification before DNS switch

1. Open the frontend temporary domain and confirm Arabic and English public pages.
2. Log in as admin, coach, and player.
3. Upload a profile image, restart the backend app, and confirm the image still loads.
4. Redeploy the backend and confirm the same image still loads.
5. Confirm the QR URL uses the final `NEXT_PUBLIC_APP_URL`.
6. Confirm the player AI quota reports two messages per Damascus calendar day.
7. Only then point `example.com` and `api.example.com` to Hostinger.
