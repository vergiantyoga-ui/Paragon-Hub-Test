import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const bool = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '127.0.0.1',
  env: process.env.NODE_ENV ?? 'development',
  schemaVersion: '1.0.0',

  dbFile:
    process.env.DB_FILE === ':memory:'
      ? ':memory:'
      : path.resolve(root, process.env.DB_FILE ?? 'data/paragon.db'),

  /**
   * Rahasia penanda tangan JWT. Wajib diisi di luar pengembangan — server
   * menolak start bila masih memakai nilai bawaan saat NODE_ENV=production.
   */
  jwtSecret: process.env.JWT_SECRET ?? 'paragon-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',

  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /**
   * Mode demo: kata sandi apa pun diterima asal email atau ID akun cocok,
   * persis seperti front-end tanpa backend. Matikan untuk memakai hash asli.
   */
  demoAuth: bool(process.env.DEMO_AUTH, true),

  seedOnStart: bool(process.env.SEED_ON_START, true),
};

export function assertProductionConfig() {
  if (config.env !== 'production') return;
  if (config.jwtSecret === 'paragon-dev-secret-change-me') {
    throw new Error('JWT_SECRET wajib diisi saat NODE_ENV=production.');
  }
  if (config.demoAuth) {
    throw new Error('DEMO_AUTH harus false saat NODE_ENV=production.');
  }
}
