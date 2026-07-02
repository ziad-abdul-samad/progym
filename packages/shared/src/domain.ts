export const USER_ROLES = ['MEMBER', 'COACH', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DASHBOARD_LOCALE = 'ar' as const;
export const PUBLIC_LOCALES = ['ar', 'en'] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const SUBSCRIPTION_STATUSES = [
  'PENDING',
  'ACTIVE',
  'FROZEN',
  'EXPIRED',
  'CANCELLED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COACH_ASSIGNMENT_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'] as const;
export type CoachAssignmentStatus = (typeof COACH_ASSIGNMENT_STATUSES)[number];

export const QR_INVITE_STATUSES = ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'] as const;
export type QrInviteStatus = (typeof QR_INVITE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'SYSTEM',
  'MEMBERSHIP',
  'ATTENDANCE',
  'PROGRESS',
  'COACHING',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
