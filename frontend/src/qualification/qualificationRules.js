import { ROLE, STATUS } from '../lib/constants.js';
import { findCommodity, findCountry } from './data/referenceData.js';

/**
 * Aturan kualifikasi pemasok.
 *
 * Kualifikasi baru boleh diisi setelah profil pemasok tuntas dan disetujui.
 * Fungsi di sini murni supaya syarat kelayakan dan validasi barisnya dapat
 * diuji tanpa merender apa pun.
 */

export const QUALIFICATION_STATUS = {
  NOT_STARTED: 'not_started',
  DRAFT: 'draft',
  COMPLETED: 'completed',
};

export const QUALIFICATION_STATUS_LABEL = {
  [QUALIFICATION_STATUS.NOT_STARTED]: 'Belum diisi',
  [QUALIFICATION_STATUS.DRAFT]: 'Draf',
  [QUALIFICATION_STATUS.COMPLETED]: 'Selesai',
};

export const QUALIFICATION_STATUS_TONE = {
  [QUALIFICATION_STATUS.NOT_STARTED]: 'neutral',
  [QUALIFICATION_STATUS.DRAFT]: 'progress',
  [QUALIFICATION_STATUS.COMPLETED]: 'success',
};

/** Role yang boleh mengisi kualifikasi. Manager hanya dapat melihat. */
export function canFillQualification(user) {
  return user?.role === ROLE.STAFF || user?.role === ROLE.ADMIN;
}

export function canViewQualification(user) {
  return canFillQualification(user) || user?.role === ROLE.MANAGER;
}

/**
 * Status pemasok yang sudah boleh dikualifikasi.
 *
 * Gerbangnya adalah **profil yang sudah dikirim pemasok**, bukan dokumen yang
 * sudah diverifikasi. Kedua jalur onboarding bertemu di titik ini:
 *  - Jalur undangan: pemasok mengisi profil sendiri lalu mengirimkannya.
 *  - Jalur registrasi internal: manager menyetujui isian admin lebih dahulu,
 *    barulah pemasok meninjau dan mengirimkannya.
 *
 * `NEEDS_DOCUMENT_FIX` ikut disertakan karena profilnya sudah pernah dikirim,
 * dan kategori komoditas maupun negara asal tidak bergantung pada keabsahan
 * dokumen legalitas yang sedang diperbaiki. Dengan begitu kualifikasi dapat
 * berjalan berdampingan dengan verifikasi dokumen, bukan mengantre di belakangnya.
 */
export const QUALIFIABLE_STATUSES = [
  STATUS.REGISTRATION,
  STATUS.NEEDS_DOCUMENT_FIX,
  STATUS.QUALIFICATION,
  STATUS.AWAITING_PREFERRED,
  STATUS.PREFERRED,
];

export function isEligible(submission) {
  return QUALIFIABLE_STATUSES.includes(submission?.status);
}

/** Alasan sebuah pemasok belum layak, untuk ditampilkan apa adanya. */
export function ineligibilityReason(submission) {
  if (!submission) return 'Pemasok tidak ditemukan.';
  if (isEligible(submission)) return null;

  const stage = {
    [STATUS.SUPPLIER_REQUEST]: 'pendaftarannya masih menunggu ditinjau',
    [STATUS.REJECTED]: 'pendaftarannya ditolak',
    [STATUS.APPROVED]: 'jalur onboarding-nya belum dipilih',
    [STATUS.INVITED]: 'belum mulai mengisi profil',
    [STATUS.INTERNAL_DRAFT]: 'profilnya masih diisi admin procurement',
    [STATUS.CONNECTED]: 'belum meninjau profil yang disiapkan tim Paragon',
    [STATUS.ONBOARDING]: 'belum selesai mengisi profil',
  }[submission.status];

  return `Kualifikasi terbuka setelah pemasok mengirimkan profilnya; saat ini ${stage ?? 'profilnya belum dikirim'}.`;
}

/* ------------------------------------------------------------------ */
/* Baris kualifikasi                                                  */
/* ------------------------------------------------------------------ */

let lineCounter = 0;

export function makeLine(overrides = {}) {
  lineCounter += 1;
  return {
    id: `ql_${Date.now().toString(36)}${lineCounter.toString(36)}`,
    commodityCode: '',
    countryCode: '',
    notes: '',
    ...overrides,
  };
}

/**
 * Memvalidasi seluruh baris. Mengembalikan peta lineId → peta kolom → pesan.
 * Baris yang seluruhnya kosong diabaikan: baris kosong di akhir tabel adalah
 * hal biasa saat mengisi dan bukan kesalahan.
 */
export function validateLines(lines) {
  const errors = {};
  const seen = new Map();

  lines.forEach((line) => {
    if (isBlankLine(line)) return;

    const lineErrors = {};

    if (!line.commodityCode) {
      lineErrors.commodityCode = 'Pilih kategori komoditas.';
    } else if (!findCommodity(line.commodityCode)) {
      lineErrors.commodityCode = 'Kode komoditas tidak dikenal.';
    }

    if (!line.countryCode) {
      lineErrors.countryCode = 'Pilih negara asal.';
    } else if (!findCountry(line.countryCode)) {
      lineErrors.countryCode = 'Kode negara tidak dikenal.';
    }

    // Pasangan komoditas dan negara yang sama tidak boleh berulang; duplikat
    // hanya akan menggandakan data tanpa menambah keterangan apa pun.
    if (line.commodityCode && line.countryCode) {
      const key = `${line.commodityCode}|${line.countryCode}`;
      if (seen.has(key)) {
        lineErrors.commodityCode = 'Pasangan komoditas dan negara ini sudah ada.';
      } else {
        seen.set(key, line.id);
      }
    }

    if (Object.keys(lineErrors).length > 0) errors[line.id] = lineErrors;
  });

  return errors;
}

export function isBlankLine(line) {
  return !line.commodityCode && !line.countryCode && !line.notes?.trim();
}

/** Baris yang benar-benar terisi; baris kosong dibuang saat menyimpan. */
export function meaningfulLines(lines) {
  return lines.filter((line) => !isBlankLine(line));
}

/** Kualifikasi dianggap selesai bila ada minimal satu baris yang sahih. */
export function isComplete(lines) {
  const filled = meaningfulLines(lines);
  return filled.length > 0 && Object.keys(validateLines(filled)).length === 0;
}

/** Ringkasan untuk daftar: jumlah komoditas dan negara yang berbeda. */
export function summariseLines(lines = []) {
  const filled = meaningfulLines(lines);
  return {
    lines: filled.length,
    commodities: new Set(filled.map((line) => line.commodityCode)).size,
    countries: new Set(filled.map((line) => line.countryCode)).size,
  };
}
