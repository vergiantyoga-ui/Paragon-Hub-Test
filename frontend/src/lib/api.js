/**
 * Klien HTTP ke API Paragon Supplier Hub.
 *
 * Satu berkas, tanpa pustaka tambahan. Yang dijaga di sini ada tiga hal:
 *
 * 1. **Token menunggu.** Aksi masuk berjalan serentak dengan permintaan tulis
 *    pertama. Tanpa penjaga, permintaan itu bisa berangkat sebelum tokennya
 *    tiba dan ditolak 401. `authReady` membuat setiap permintaan tulis
 *    menunggu proses masuk yang sedang berjalan selesai lebih dulu.
 * 2. **Kegagalan tidak menjatuhkan antarmuka.** Bila server mati, aplikasi
 *    tetap berjalan di atas data contoh di memori. Status ketersediaan
 *    dilaporkan lewat `onStatusChange` supaya antarmuka bisa memberi tahu
 *    penggunanya, bukan diam-diam kehilangan data.
 * 3. **Bentuk galat tunggal.** Seluruh galat API dilempar sebagai `ApiError`
 *    dengan status dan pesan dari server.
 */

const BASE_URL = import.meta.env?.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'paragon.token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;
  }
}

/* --------------------------------- Token -------------------------------- */

let token = null;
let authReady = Promise.resolve();

try {
  token = globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null;
} catch {
  // Peramban dengan penyimpanan dimatikan tetap dapat memakai aplikasi;
  // tokennya hanya tidak bertahan saat halaman disegarkan.
  token = null;
}

export function setToken(value) {
  token = value;
  try {
    if (value) globalThis.sessionStorage?.setItem(TOKEN_KEY, value);
    else globalThis.sessionStorage?.removeItem(TOKEN_KEY);
  } catch {
    /* diabaikan: token tetap berlaku selama sesi ini */
  }
}

export const getToken = () => token;

/** Menahan permintaan tulis sampai proses masuk yang sedang berjalan selesai. */
function trackAuth(promise) {
  authReady = promise.catch(() => {});
  return promise;
}

/* ------------------------------ Ketersediaan ----------------------------- */

let online = true;
const listeners = new Set();

function setOnline(value) {
  if (online === value) return;
  online = value;
  for (const listener of listeners) listener(value);
}

export const isOnline = () => online;

export function onStatusChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* -------------------------------- Request -------------------------------- */

async function request(method, path, { body, auth = false, signal } = {}) {
  if (auth) await authReady;

  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      signal,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    setOnline(false);
    throw new ApiError(0, 'Tidak dapat menghubungi server.', { cause: String(error) });
  }

  setOnline(true);

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `Permintaan gagal (${response.status}).`,
      payload?.error?.details,
    );
  }

  return payload;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const get = (path, options) => request('GET', path, options);
const post = (path, body, options) => request('POST', path, { ...options, body, auth: true });
const put = (path, body, options) => request('PUT', path, { ...options, body, auth: true });
const patch = (path, body, options) => request('PATCH', path, { ...options, body, auth: true });
const del = (path, options) => request('DELETE', path, { ...options, auth: true });

/* --------------------------------- API ---------------------------------- */

export const api = {
  health: () => get('/health'),

  /** Seluruh keadaan awal dalam satu panggilan. */
  bootstrap: (signal) => get('/bootstrap', { signal }),

  auth: {
    loginInternal(email, password = 'demo') {
      return trackAuth(
        request('POST', '/auth/internal/login', { body: { email, password } }).then((result) => {
          setToken(result.token);
          return result;
        }),
      );
    },

    loginSupplier(accountId, password = 'demo') {
      return trackAuth(
        request('POST', '/auth/supplier/login', { body: { accountId, password } }).then(
          (result) => {
            setToken(result.token);
            return result;
          },
        ),
      );
    },

    logout() {
      setToken(null);
      authReady = Promise.resolve();
    },

    changePassword: (newPassword) => post('/auth/supplier/change-password', { newPassword }),
    me: () => get('/me'),
    internalUsers: () => get('/auth/internal/users'),
  },

  suppliers: {
    list: (query = '') => get(`/suppliers${query}`),
    find: (id) => get(`/suppliers/${id}`),
    register: (payload) => request('POST', '/suppliers', { body: payload }),
    save: (submission) => put(`/suppliers/${submission.id}`, submission),
    remove: (id) => del(`/suppliers/${id}`),
    qualification: (id) => get(`/suppliers/${id}/qualification`),
    saveQualification: (id, payload) => put(`/suppliers/${id}/qualification`, payload),
  },

  questionnaires: {
    templates: (query = '') => get(`/questionnaire-templates${query}`),
    template: (id) => get(`/questionnaire-templates/${id}`),
    createTemplate: (payload) => post('/questionnaire-templates', payload),
    updateTemplate: (id, payload) => patch(`/questionnaire-templates/${id}`, payload),
    saveTemplate: (template) => put(`/questionnaire-templates/${template.id}`, template),

    versions: (templateId) =>
      get(`/questionnaire-versions${templateId ? `?templateId=${templateId}` : ''}`),
    version: (id) => get(`/questionnaire-versions/${id}`),
    createVersion: (payload) => post('/questionnaire-versions', payload),
    saveVersion: (version) => put(`/questionnaire-versions/${version.id}`, version),
    publish: (id) => post(`/questionnaire-versions/${id}/publish`),
    unpublish: (id) => post(`/questionnaire-versions/${id}/unpublish`),
    archive: (id) => post(`/questionnaire-versions/${id}/archive`),

    questionLibrary: () => get('/question-library'),
    sectionLibrary: () => get('/section-library'),
    addQuestionLibraryItem: (item) => post('/question-library', item),
    addSectionLibraryItem: (item) => post('/section-library', item),
  },

  assignments: {
    list: (query = '') => get(`/assignments${query}`),
    find: (id) => get(`/assignments/${id}`),
    create: (payload) => post('/assignments', payload),
    save: (assignment) => put(`/assignments/${assignment.id}`, assignment),
  },

  responses: {
    list: (query = '') => get(`/responses${query}`),
    find: (id) => get(`/responses/${id}`),
    save: (response) => put(`/responses/${response.id}`, response),
    saveDraft: (id, payload) => patch(`/responses/${id}/answers`, payload),
    submit: (id, payload) => post(`/responses/${id}/submit`, payload),
    review: (id, payload) => post(`/responses/${id}/reviews`, payload),
    revisions: (id) => get(`/responses/${id}/revisions`),
  },

  masterData: {
    all: () => get('/master-data'),
    domain: (name, parent) => get(`/master-data/${name}${parent ? `?parent=${parent}` : ''}`),
  },

  notifications: {
    list: (query = '') => get(`/notifications${query}`),
    create: (payload) => post('/notifications', payload),
    markRead: (id) => post(`/notifications/${id}/read`),
    markAllRead: (audience) => post('/notifications/read-all', { audience }),
  },

  audit: {
    list: (query = '') => get(`/audit-logs${query}`),
    record: (entry) => post('/audit-logs', entry),
  },

  dashboard: {
    kpi: () => get('/questionnaire-dashboard/kpi'),
  },
};

export default api;
