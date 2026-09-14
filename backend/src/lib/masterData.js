/**
 * Jembatan ke master data milik front-end.
 *
 * Daftar kode — bentuk badan usaha, bank, termin pembayaran, komoditas —
 * dipakai kedua sisi. Menyalinnya ke backend berarti dua daftar yang harus
 * dijaga tetap sama, dan daftar yang menyimpang diam-diam adalah cara paling
 * mudah membuat kode tersimpan tidak cocok dengan kode yang ditampilkan.
 * Karena itu `frontend/src/lib/masterData.js` tetap menjadi satu-satunya
 * sumber, dan modul ini hanya meneruskannya.
 *
 * Berkasnya JavaScript murni — tanpa React, tanpa CSS — sehingga Node dapat
 * memuatnya langsung. Bila kelak backend dipisah repositori, cukup pindahkan
 * berkas itu ke paket bersama dan ubah jalur di sini.
 */

export {
  LEGAL_STATUSES,
  LEGAL_STATUS_ENTITY,
  ENTITY_TYPES,
  VENDOR_TYPES,
  VENDOR_TYPE_DETAILS,
  detailsForVendorType,
  CORPORATE_ENTITIES,
  TARGET_COMPANIES,
  corporateCodesFor,
  OTV_STATUSES,
  VENDOR_DIRECT_TYPES,
  TRANSACTION_TYPES,
  EINVOICE_TRANSACTION_TYPE,
  eInvoiceFor,
  TAX_DOCUMENTS,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_GROUPS,
  AGREEMENT_RATE_OPTIONS,
  TERMS_OF_PAYMENT,
  FISCAL_POSITIONS,
  ACCOUNT_TYPES,
  BANKS,
  findBank,
  labelOf,
} from '../../../frontend/src/lib/masterData.js';

export {
  UNSPSC_SEGMENTS,
  UNSPSC_COMMODITIES,
  COUNTRIES as QUALIFICATION_COUNTRIES,
} from '../../../frontend/src/qualification/data/referenceData.js';

export {
  STATUS,
  ROLE,
  PATH,
  CURRENCIES,
  MAX_CONTACTS,
  PASSWORD_VALID_DAYS,
  POST_REGISTRATION_STATUSES,
} from '../../../frontend/src/lib/constants.js';
