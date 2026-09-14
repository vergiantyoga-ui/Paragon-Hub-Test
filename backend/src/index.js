import { assertProductionConfig, config } from './config.js';
import { getDb, migrate } from './db/connection.js';
import { seed } from './db/seed.js';
import { createApp } from './app.js';

assertProductionConfig();

const db = getDb();
migrate(db);

if (config.seedOnStart) {
  const result = seed({ force: false });
  if (result.inserted) {
    console.log(`[db] data contoh dimuat: ${result.summary}`);
  }
}

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`[api] Paragon Supplier Hub API — http://${config.host}:${config.port}/api`);
  console.log(`[db]  ${config.dbFile}`);
  if (config.demoAuth) console.log('[api] DEMO_AUTH aktif: kata sandi apa pun diterima.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    db.close();
    process.exit(0);
  });
}
