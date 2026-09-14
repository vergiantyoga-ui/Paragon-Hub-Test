import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/http.js';

/**
 * Token ditandatangani server dan berisi identitas beserta peran. Otorisasi
 * ditegakkan di sini, bukan disembunyikan di antarmuka — menu yang tidak
 * tampak bukan berarti endpoint-nya tidak bisa dipanggil.
 */

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function readToken(req) {
  const header = req.get('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

/** Mengisi req.auth bila ada token sah, tanpa menolak yang tidak punya. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.auth = jwt.verify(token, config.jwtSecret);
  } catch {
    req.auth = null;
  }
  next();
}

export function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(unauthorized('Token kedaluwarsa atau tidak sah. Silakan masuk kembali.'));
  }
}

/** requireRole('staff', 'admin') — peran di luar daftar ditolak 403. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(forbidden(`Tindakan ini hanya untuk peran: ${roles.join(', ')}.`));
    }
    return next();
  };
}

/** Pemasok hanya boleh menyentuh datanya sendiri. */
export function requireOwnSupplier(paramName = 'id') {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.kind === 'internal') return next();
    if (req.auth.supplierId === req.params[paramName]) return next();
    return next(forbidden('Anda hanya dapat mengakses data perusahaan sendiri.'));
  };
}

export const actorOf = (req) =>
  req.auth ? { id: req.auth.sub, name: req.auth.name, role: req.auth.role } : null;
