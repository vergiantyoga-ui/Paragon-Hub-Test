import { getDb, migrate } from '../src/db/connection.js';
import { config } from '../src/config.js';

migrate(getDb());
console.log(`[db] skema diterapkan pada ${config.dbFile}`);
