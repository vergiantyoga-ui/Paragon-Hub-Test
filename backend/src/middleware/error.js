import { HttpError } from '../lib/http.js';
import { config } from '../config.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Rute tidak dikenal: ${req.method} ${req.path}` } });
}

/**
 * Satu bentuk galat untuk seluruh API: { error: { message, details } }.
 * Jejak tumpukan hanya ikut saat pengembangan.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err instanceof HttpError ? err.status : 500;

  if (status >= 500) console.error('[api]', err);

  res.status(status).json({
    error: {
      message: status >= 500 ? 'Terjadi galat pada server.' : err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(config.env === 'development' && status >= 500 ? { stack: err.stack } : {}),
    },
  });
}
