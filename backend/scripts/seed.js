import { seed } from '../src/db/seed.js';
import { config } from '../src/config.js';

const force = process.argv.includes('--force');
const result = seed({ force });

console.log(
  result.inserted
    ? `[db] data contoh dimuat ke ${config.dbFile}: ${result.summary}`
    : `[db] dilewati — ${result.summary}. Jalankan dengan --force untuk menimpa.`,
);
