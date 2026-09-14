/** Galat yang sudah punya status HTTP. Selain ini dianggap 500. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details ?? null;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Token tidak ada atau tidak berlaku.') =>
  new HttpError(401, message);
export const forbidden = (message = 'Anda tidak berwenang melakukan tindakan ini.') =>
  new HttpError(403, message);
export const notFound = (message = 'Data tidak ditemukan.') => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);

/** Membungkus handler async supaya galatnya sampai ke middleware error. */
export const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
