# Run Pro Gym Locally

Use PowerShell from the project root:

```powershell
cd C:\progym
```

## 1. Install Dependencies

```powershell
corepack pnpm install
```

## 2. Start PostgreSQL

Current local setup uses PostgreSQL 17 on port `55432`.

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:TEMP\progym-postgres-17-data" -l "$env:TEMP\progym-postgres-17.log" -o "-p 55432" start
```

If PostgreSQL is already running, this command may say the server is already started. That is fine.

## 3. Apply Database and Seed Data

```powershell
corepack pnpm --filter @progym/backend db:migrate
corepack pnpm --filter @progym/backend db:seed
```

Seeded admin account:

```txt
username: admin
password: Admin@123456
```

Seeded demo accounts:

```txt
password for all demo users: Demo@123456

coaches: coach.omar, coach.karim
members: ahmad, mohammad, sami, hadi, yazan, firas
```

## 4. Run Backend

Optional: to enable the real Gemini-powered food analyzer, add these values to `backend/.env`:

```txt
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash
```

The nutrition chat now uses the real Gemini API with each member's profile and recent conversation
as context. Without a key, it shows a clear configuration error instead of returning a limited
hardcoded food estimate.

Open a new PowerShell terminal:

```powershell
cd C:\progym
corepack pnpm --filter @progym/backend dev
```

Backend URL:

```txt
http://localhost:4000/api/v1
```

Swagger:

```txt
http://localhost:4000/api/docs
```

## 5. Run Frontend

For normal development, open a new PowerShell terminal:

```powershell
cd C:\progym
corepack pnpm --filter @progym/frontend dev
```

For customer preview, use production mode instead:

```powershell
cd C:\progym
corepack pnpm --filter @progym/frontend build
corepack pnpm --filter @progym/frontend start
```

Frontend URLs:

```txt
Arabic public site:  http://localhost:3000/ar
English public site: http://localhost:3000/en
Login:               http://localhost:3000/ar/login
Admin dashboard:     http://localhost:3000/ar/dashboard/admin
```

## QR Testing From a Phone

If you scan a QR from a real phone, `localhost` will point to the phone itself, not your computer.

Use one of these:

```txt
http://YOUR-LAN-IP:3000/ar
```

or expose the frontend with a tunnel, then set:

```powershell
$env:NEXT_PUBLIC_APP_URL="http://YOUR-LAN-IP:3000"
corepack pnpm --filter @progym/frontend dev -- --hostname 0.0.0.0
```

Keep the backend running on the same machine. The frontend proxies `/api/v1/*` to the backend.

## 6. Stop PostgreSQL

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:TEMP\progym-postgres-17-data" stop
```
