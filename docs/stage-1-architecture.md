# Pro Gym Stage 1 Architecture

## Product boundary

Pro Gym is a single-branch gym platform with three roles: `MEMBER`, `COACH`, and `ADMIN`.

There is no private-client role. A private client is represented by an active `CoachAssignment` between a member and a coach.

## Application architecture

- `frontend/` owns the public website and Arabic dashboard UI.
- `backend/` owns REST APIs, authentication, authorization, operational workflows, and persistence.
- `packages/shared/` owns shared enums and transport contracts used by both apps.
- `infra/` owns local and production deployment templates.

The backend API prefix is `/api/v1`. Swagger is exposed at `/api/docs` in development and protected or disabled by deployment policy for production.

## Frontend architecture

- Public website routes are localized under `/ar` and `/en`.
- Arabic is the default locale.
- Dashboard routes are Arabic-only under `/ar/dashboard`.
- Public pages should be server-rendered or statically rendered first.
- Dashboard data should come from authenticated API calls through TanStack Query.
- GSAP, Three.js, and React Three Fiber should be isolated to client components and respect reduced-motion preferences.

## Backend architecture

NestJS is organized by feature module:

- `auth`
- `users`
- `members`
- `coaches`
- `memberships`
- `attendance`
- `progress`
- `notifications`
- `analytics`
- `admin`

Shared backend infrastructure lives under `src/common` and `src/prisma`.

## Database architecture

Prisma is the schema source of truth. The Stage 1 contract is in `backend/prisma/schema.prisma`.

Key relationships:

- `User` has exactly one role and optional member or coach profile.
- `MemberProfile` owns subscriptions, attendance, progress, workout plans, and coach assignments.
- `CoachProfile` owns assigned members, exercises, workout plans, and public coach profile fields.
- `CoachAssignment` models private client relationships.
- `QrInvite` and `AttendanceQrSession` store token hashes only.
- `AttendanceRecord` enforces one attendance row per member per date.
- `Notification` is Arabic-only for the dashboard.
- `AuditLog` records security-sensitive actions.
- `GymSettings` stores single-branch public business settings.

## Implementation stages

- Prompt A should implement authentication, roles, QR registration, QR attendance, dashboards, memberships, progress, notifications, analytics, APIs, and database migrations.
- Prompt B should implement the public bilingual website, SEO, Arabic/English content, motion design, brand identity, GSAP, Three.js, and scroll storytelling.

Both prompts must preserve this folder structure and data model unless a later requirement explicitly changes the architecture.
