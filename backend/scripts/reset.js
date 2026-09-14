import fs from 'node:fs';
import { config } from '../src/config.js';
import { seed } from '../src/db/seed.js';

/** Menghapus berkas basis data lalu memuat ulang data contoh. */
if (config.dbFile !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${config.dbFile}${suffix}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

const result = seed({ force: true });
console.log(`[db] basis data dibuat ulang: ${result.summary}`);
