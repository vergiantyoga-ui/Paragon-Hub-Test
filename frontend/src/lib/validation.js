import { ACCEPTED_FILE_TYPES, MAX_FILE_BYTES } from './constants.js';

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

/** NIK wajib tepat 16 digit (Section 7.3). */
export function validateNik(value) {
  const digits = digitsOnly(value);
  if (!digits) return 'Nomor NIK wajib diisi.';
  if (digits.length !== 16) return `NIK harus 16 digit. Saat ini ${digits.length} digit.`;
  return null;
}

/**
 * NPWP wajib 16 digit (format baru, keputusan v1.4).
 * Input 15 digit dinormalisasi otomatis dengan menambah 0 di depan,
 * supaya pemasok yang masih memegang NPWP format lama tidak tertahan.
 */
export function normalizeNpwp(value) {
  const digits = digitsOnly(value);
  return digits.length === 15 ? `0${digits}` : digits;
}

export function validateNpwp(value) {
  const digits = digitsOnly(value);
  if (!digits) return 'Nomor NPWP wajib diisi.';
  if (digits.length === 15) return null; // dinormalisasi saat disimpan
  if (digits.length !== 16) return `NPWP harus 16 digit. Saat ini ${digits.length} digit.`;
  return null;
}

export function wasNpwpNormalized(value) {
  return digitsOnly(value).length === 15;
}

/** Format NPWP 16 digit sebagai xx.xxx.xxx.x-xxx.xxx agar mudah dibaca. */
export function formatNpwp(value) {
  const d = normalizeNpwp(value);
  if (d.length !== 16) return value ?? '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
}

export function validateEmail(value) {
  if (!value) return 'Alamat email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format email belum benar.';
  return null;
}

export function validatePhone(value, { required = true } = {}) {
  if (!value) return required ? 'Nomor telepon wajib diisi.' : null;
  const digits = digitsOnly(value);
  if (digits.length < 8 || digits.length > 15) return 'Nomor telepon terdiri dari 8–15 digit.';
  return null;
}

export function required(value, label = 'Kolom ini') {
  if (value === null || value === undefined) return `${label} wajib diisi.`;
  if (typeof value === 'string' && !value.trim()) return `${label} wajib diisi.`;
  if (Array.isArray(value) && value.length === 0) return `${label} wajib diisi.`;
  return null;
}

/**
 * Nama berkas hanya boleh memuat huruf, angka, spasi, titik, tanda hubung,
 * garis bawah, dan tanda kurung. Karakter di luar itu kerap membuat berkas
 * gagal dibuka setelah dipindahkan antar sistem, dan masalahnya baru ketahuan
 * jauh setelah diunggah — jadi ditolak sejak awal.
 */
const SAFE_FILE_NAME = /^[A-Za-z0-9 ._()-]+$/;

export function validateFileName(name) {
  if (!name) return 'Berkas tidak memiliki nama.';
  if (!SAFE_FILE_NAME.test(name)) {
    return 'Nama berkas hanya boleh memuat huruf, angka, spasi, titik, tanda hubung, garis bawah, dan tanda kurung.';
  }
  return null;
}

/** Berkas: PDF/JPG/PNG maksimal 2 MB, dengan nama yang aman. */
export function validateFile(file) {
  if (!file) return 'Dokumen wajib diunggah.';
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return 'Format berkas harus PDF, JPG, atau PNG.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran berkas ${formatBytes(file.size)} melebihi batas 2 MB.`;
  }
  return validateFileName(file.name);
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Masa berlaku sertifikat tidak boleh sudah lewat saat diunggah. */
export function validateExpiry(value, { required: isRequired = false } = {}) {
  if (!value) return isRequired ? 'Masa berlaku wajib diisi.' : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(value) < today) return 'Masa berlaku sudah lewat.';
  return null;
}

/** Menjalankan sekumpulan aturan dan mengembalikan peta error yang tidak kosong. */
export function collectErrors(rules) {
  return Object.entries(rules).reduce((acc, [field, message]) => {
    if (message) acc[field] = message;
    return acc;
  }, {});
}
