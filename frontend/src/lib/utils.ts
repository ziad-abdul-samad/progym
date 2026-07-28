import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCompactDateTime(value: string | Date): string {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat('ar', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
  }).format(date);
  return `${datePart}، ${timePart}`;
}

export function formatCompactDate(value: string | Date): string {
  return new Intl.DateTimeFormat('ar', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function formatShiftTime(value: string | null | undefined): string {
  if (!value) return '—';
  if (/\b(?:AM|PM)\b/i.test(value)) return value.toUpperCase();
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}
