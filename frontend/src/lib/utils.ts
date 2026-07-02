import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCompactDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('ar', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function formatCompactDate(value: string | Date): string {
  return new Intl.DateTimeFormat('ar', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}
