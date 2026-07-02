import { createHash, randomBytes } from 'crypto';

import argon2 from 'argon2';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    memoryCost: 19_456,
    parallelism: 1,
    timeCost: 2,
    type: argon2.argon2id,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function hashSecurityAnswer(answer: string): Promise<string> {
  return hashPassword(normalizeAnswer(answer));
}

export async function verifySecurityAnswer(hash: string, answer: string): Promise<boolean> {
  return verifyPassword(hash, normalizeAnswer(answer));
}
