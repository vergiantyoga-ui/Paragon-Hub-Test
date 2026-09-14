import { randomUUID } from 'node:crypto';

let counter = 0;

/** Pengenal pendek yang tetap terbaca manusia di tabel. */
export function makeId(prefix) {
  counter = (counter + 1) % 0xffff;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, '0')}`;
}

export const uuid = () => randomUUID();

export const now = () => new Date().toISOString();
