# Security Strategy

## Authentication

- Use HTTP-only secure cookies for browser sessions.
- Use short-lived access sessions with refresh rotation.
- Hash passwords with Argon2id.
- Normalize phone and email before persistence.
- Require CSRF protection for cookie-authenticated mutations.

## Authorization

- Roles are only `MEMBER`, `COACH`, and `ADMIN`.
- Members can access only their own profile, attendance, subscriptions, progress, and notifications.
- Coaches can access only members assigned through `CoachAssignment`.
- Admins can manage all operational data.

## QR security

- QR values must be high-entropy random tokens.
- Store only token hashes.
- Registration invites should expire and be single-use unless an explicit admin workflow allows regeneration.
- Attendance sessions should be short-lived, revocable, and rate-limited.

## Platform controls

- Enable Helmet headers, strict CORS, request throttling, validation pipes, and consistent API errors.
- Validate uploaded file type, size, and ownership.
- Private progress photos must never be served by public static hosting.
- Log security-sensitive actions to `AuditLog`.
