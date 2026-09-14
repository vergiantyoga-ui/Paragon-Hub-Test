import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

let instance = null;

/**
 * Satu koneksi untuk seluruh proses. better-sqlite3 bersifat sinkron, jadi
 * tidak ada pool yang perlu diurus — SQLite menangani satu penulis pada satu
 * waktu, dan mode WAL membuat pembacaan tidak ikut terkunci.
 */
export function getDb() {
  if (instance) return instance;

  if (config.dbFile !== ':memory:') {
    fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  }

  instance = new Database(config.dbFile);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.pragma('busy_timeout = 5000');
  return instance;
}

/** Menjalankan DDL. Seluruh pernyataan memakai IF NOT EXISTS, jadi aman diulang. */
export function migrate(db = getDb()) {
  const ddl = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  db.exec(ddl);
  db.prepare(
    `INSERT INTO schema_meta (key, value, updated_at) VALUES ('version', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(config.schemaVersion, new Date().toISOString());
  return db;
}

/** Membungkus sebuah fungsi dalam transaksi. */
export function tx(fn, db = getDb()) {
  return db.transaction(fn);
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}
