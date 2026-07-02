import type { Subscription, SubscriptionStatus } from '@prisma/client';

export interface MembershipSummary {
  status: SubscriptionStatus | 'NONE';
  remainingDays: number;
  startsAt: Date | null;
  endsAt: Date | null;
  subscriptionId: string | null;
  isExpired: boolean;
}

const MS_PER_DAY = 86_400_000;
export const GYM_TIME_ZONE = 'Asia/Damascus';

function gymDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: GYM_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { day: value('day'), month: value('month'), year: value('year') };
}

export function gymDate(date: Date): Date {
  const { day, month, year } = gymDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfGymMonth(date: Date): Date {
  const { month, year } = gymDateParts(date);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function startOfGymDayInstant(date: Date): Date {
  const { day, month, year } = gymDateParts(date);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const offsetName =
    new Intl.DateTimeFormat('en-US', {
      timeZone: GYM_TIME_ZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(utcMidnight))
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = match
    ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
    : 0;
  return new Date(utcMidnight - offsetMinutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function diffDaysCeil(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY));
}

export function summarizeSubscription(
  subscription: Subscription | null,
  now = new Date(),
): MembershipSummary {
  if (!subscription) {
    return {
      status: 'NONE',
      remainingDays: 0,
      startsAt: null,
      endsAt: null,
      subscriptionId: null,
      isExpired: true,
    };
  }

  const effectiveNow =
    subscription.status === 'FROZEN' && subscription.frozenAt ? subscription.frozenAt : now;
  const remainingDays = diffDaysCeil(effectiveNow, subscription.endsAt);
  const isExpired = subscription.status !== 'FROZEN' && remainingDays <= 0;

  return {
    status: isExpired ? 'EXPIRED' : subscription.status,
    remainingDays,
    startsAt: subscription.startsAt,
    endsAt: subscription.endsAt,
    subscriptionId: subscription.id,
    isExpired,
  };
}
