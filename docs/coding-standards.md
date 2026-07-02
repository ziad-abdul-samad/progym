# Coding Standards

## TypeScript

- Strict TypeScript is required across all packages.
- Prefer explicit exported types for public interfaces.
- Keep imports feature-local unless sharing through `packages/shared` or a deliberate common module.
- Use UTC dates in APIs and persistence.
- Store money as integer minor units plus a currency code.

## Backend

- Every request DTO must use validation decorators.
- Every mutation must be protected by authentication, role guards, and CSRF protection where browser cookies are involved.
- Every operationally important mutation should produce an audit log.
- Feature modules should not import another feature's internals. Share through services explicitly exported by modules.
- Prisma migrations must be generated and reviewed in Prompt A, not hand-written casually.

## Frontend

- Components must be mobile-first, accessible, and RTL-safe.
- Dashboard UI is Arabic-only and operational: dense, scannable, and low-motion.
- Public UI can be expressive but must remain performance-first and SEO-first.
- ShadCN primitives belong in `src/components/ui`; composed product components belong in feature or layout folders.
- Use `cn` from `src/lib/utils.ts` for conditional Tailwind class merging.

## Testing

- Backend unit tests cover services, guards, and token rules.
- Backend e2e tests cover auth, role access, QR registration, QR attendance, memberships, and progress.
- Frontend component tests cover reusable UI states.
- Playwright covers public routes, dashboard routes, RTL layout, mobile viewports, and critical user paths.
