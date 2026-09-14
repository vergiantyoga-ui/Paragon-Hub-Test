import { Router } from 'express';
import authRoutes from './auth.routes.js';
import supplierRoutes from './suppliers.routes.js';
import questionnaireRoutes from './questionnaire.routes.js';
import responseRoutes from './responses.routes.js';
import supportRoutes from './support.routes.js';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';

const router = Router();

router.get('/health', (_req, res) => {
  const row = getDb().prepare("SELECT value FROM schema_meta WHERE key = 'version'").get();
  res.json({
    ok: true,
    service: 'paragon-supplier-hub-api',
    env: config.env,
    schemaVersion: row?.value ?? null,
    demoAuth: config.demoAuth,
    at: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/', questionnaireRoutes);
router.use('/', responseRoutes);
router.use('/', supportRoutes);

export default router;
