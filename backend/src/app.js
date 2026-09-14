import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { config } from './config.js';

/**
 * Aplikasi Express dibuat lewat fungsi, bukan modul yang langsung
 * mendengarkan port. Dengan begitu pengujian dapat memasang aplikasi yang
 * sama di atas basis data sementara tanpa menyalakan server sungguhan.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      credentials: true,
    }),
  );
  // Metadata berkas saja yang dikirim, bukan isinya; 2 MB sudah lapang.
  app.use(express.json({ limit: '4mb' }));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
