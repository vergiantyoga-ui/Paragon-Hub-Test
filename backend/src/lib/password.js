import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * scrypt dari pustaka bawaan Node — tanpa dependensi tambahan, dan
 * parameternya cukup untuk kata sandi portal. Format: scrypt$<salt>$<hash>.
 */
export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
