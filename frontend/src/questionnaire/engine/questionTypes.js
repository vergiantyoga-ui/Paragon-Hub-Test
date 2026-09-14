import { makeAttachmentRule, makeOption } from './schema.js';

/**
 * Registri tipe pertanyaan.
 *
 * Inilah yang membuat mesin ini modular. Setiap tipe soal dijelaskan sekali di
 * sini: apakah punya pilihan, bagaimana jawabannya dianggap terisi, bagaimana
 * skornya dibaca, dan validasi tambahan apa yang berlaku. Menambah tipe baru
 * berarti menambah satu entri — tidak ada berkas lain yang perlu diubah.
 *
 * Komponen input React dipetakan terpisah pada `components/render/inputs`,
 * supaya berkas ini tetap bebas React dan dapat diuji tanpa merender apa pun.
 *
 * Bentuk tiap entri:
 *   label            nama tipe untuk ditampilkan di builder
 *   group            pengelompokan pada kotak perkakas
 *   hasOptions       apakah admin menyusun daftar pilihan
 *   optionPreset     pilihan bawaan saat tipe dipilih
 *   emptyValue       nilai awal jawaban
 *   isAnswered       apakah sebuah nilai dianggap sudah dijawab
 *   scoreOf          skor mentah sebuah jawaban, atau null bila di luar skoring
 *   supportsScoring  apakah tipe ini bisa ikut perhitungan skor
 *   validate         validasi khas tipe, di luar aturan umum
 *   allowsAttachment apakah lampiran boleh dikonfigurasi
 */

const isBlank = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

/** Skor dari daftar pilihan; mengembalikan null bila pilihan ditandai N/A. */
function scoreFromOptions(value, options) {
  const chosen = options.find((option) => option.value === value);
  if (!chosen) return null;
  if (chosen.excludeFromScoring) return null;
  return chosen.score;
}

/** Skor gabungan untuk pilihan ganda: rata-rata skor pilihan yang dipilih. */
function scoreFromMultiple(value, options) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const scored = value
    .map((v) => options.find((o) => o.value === v))
    .filter((o) => o && !o.excludeFromScoring);
  if (scored.length === 0) return null;
  return scored.reduce((sum, o) => sum + o.score, 0) / scored.length;
}

const textBase = {
  hasOptions: false,
  optionPreset: () => [],
  emptyValue: '',
  isAnswered: (value) => !isBlank(value) && String(value).trim().length > 0,
  scoreOf: () => null,
  supportsScoring: false,
  allowsAttachment: true,
  validate: (question, value) => {
    const text = String(value ?? '');
    const { minLength, maxLength, pattern, patternMessage } = question.validation ?? {};
    if (minLength && text.length < minLength) {
      return `Minimal ${minLength} karakter.`;
    }
    if (maxLength && text.length > maxLength) {
      return `Maksimal ${maxLength} karakter.`;
    }
    if (pattern && text && !new RegExp(pattern).test(text)) {
      return patternMessage ?? 'Format belum sesuai.';
    }
    return null;
  },
};

const numberBase = {
  hasOptions: false,
  optionPreset: () => [],
  emptyValue: '',
  isAnswered: (value) => !isBlank(value) && !Number.isNaN(Number(value)),
  scoreOf: () => null,
  supportsScoring: false,
  allowsAttachment: true,
  validate: (question, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return 'Isian harus berupa angka.';
    const { min, max } = question.validation ?? {};
    if (min !== undefined && num < min) return `Tidak boleh kurang dari ${min}.`;
    if (max !== undefined && num > max) return `Tidak boleh lebih dari ${max}.`;
    return null;
  },
};

const choiceBase = {
  hasOptions: true,
  emptyValue: null,
  isAnswered: (value) => !isBlank(value),
  scoreOf: (value, question) => scoreFromOptions(value, question.options),
  supportsScoring: true,
  allowsAttachment: true,
  validate: () => null,
};

export const QUESTION_TYPES = {
  /* ------------------------------ Teks ------------------------------ */
  short_text: { ...textBase, label: 'Teks pendek', group: 'text' },
  long_text: { ...textBase, label: 'Teks panjang', group: 'text' },

  /* ---------------------------- Pilihan ----------------------------- */
  single_choice: {
    ...choiceBase,
    label: 'Pilihan tunggal',
    group: 'choice',
    optionPreset: () => [
      makeOption({ label: 'Pilihan A', value: 'a' }),
      makeOption({ label: 'Pilihan B', value: 'b' }),
    ],
  },

  multiple_choice: {
    ...choiceBase,
    label: 'Pilihan ganda',
    group: 'choice',
    emptyValue: [],
    scoreOf: (value, question) => scoreFromMultiple(value, question.options),
    optionPreset: () => [
      makeOption({ label: 'Pilihan A', value: 'a' }),
      makeOption({ label: 'Pilihan B', value: 'b' }),
    ],
    validate: (question, value) => {
      const picked = Array.isArray(value) ? value.length : 0;
      const { minSelected, maxSelected } = question.validation ?? {};
      if (minSelected && picked < minSelected) return `Pilih minimal ${minSelected}.`;
      if (maxSelected && picked > maxSelected) return `Pilih maksimal ${maxSelected}.`;
      return null;
    },
  },

  dropdown: {
    ...choiceBase,
    label: 'Daftar pilihan',
    group: 'choice',
    optionPreset: () => [
      makeOption({ label: 'Pilihan A', value: 'a' }),
      makeOption({ label: 'Pilihan B', value: 'b' }),
    ],
  },

  yes_no: {
    ...choiceBase,
    label: 'Ya / Tidak',
    group: 'choice',
    optionPreset: () => [
      makeOption({ label: 'Ya', value: 'yes', score: 4 }),
      makeOption({ label: 'Tidak', value: 'no', score: 0 }),
    ],
  },

  yes_no_na: {
    ...choiceBase,
    label: 'Ya / Tidak / Tidak berlaku',
    group: 'choice',
    optionPreset: () => [
      makeOption({ label: 'Ya', value: 'yes', score: 4 }),
      makeOption({ label: 'Sebagian', value: 'partial', score: 2 }),
      makeOption({ label: 'Tidak', value: 'no', score: 0 }),
      makeOption({ label: 'Tidak berlaku', value: 'na', score: 0, excludeFromScoring: true }),
    ],
  },

  /* ----------------------------- Angka ------------------------------ */
  number: { ...numberBase, label: 'Angka', group: 'number' },
  percentage: {
    ...numberBase,
    label: 'Persentase',
    group: 'number',
    validate: (question, value) => {
      const base = numberBase.validate(question, value);
      if (base) return base;
      const num = Number(value);
      if (num < 0 || num > 100) return 'Persentase berada di antara 0 dan 100.';
      return null;
    },
  },
  currency: { ...numberBase, label: 'Nilai uang', group: 'number' },

  /* ---------------------------- Tanggal ----------------------------- */
  date: {
    ...textBase,
    label: 'Tanggal',
    group: 'date',
    isAnswered: (value) => !isBlank(value),
    validate: () => null,
  },
  date_range: {
    ...textBase,
    label: 'Rentang tanggal',
    group: 'date',
    emptyValue: { from: '', to: '' },
    isAnswered: (value) => Boolean(value?.from && value?.to),
    validate: (question, value) => {
      if (value?.from && value?.to && new Date(value.from) > new Date(value.to)) {
        return 'Tanggal mulai melewati tanggal akhir.';
      }
      return null;
    },
  },

  /* ----------------------------- Berkas ----------------------------- */
  file_single: {
    ...textBase,
    label: 'Unggah berkas',
    group: 'file',
    emptyValue: [],
    // Pada tipe berkas, lampiran itulah jawabannya. Penanda ini dibaca mesin
    // validasi dan kelengkapan supaya keduanya memeriksa daftar berkas, bukan
    // kolom jawaban yang memang selalu kosong untuk tipe ini.
    answerIsAttachment: true,
    isAnswered: (value) => Array.isArray(value) && value.length > 0,
    validate: () => null,
    defaultAttachmentRule: () => makeAttachmentRule({ required: true, maxFiles: 1 }),
  },
  file_multiple: {
    ...textBase,
    label: 'Unggah beberapa berkas',
    group: 'file',
    emptyValue: [],
    answerIsAttachment: true,
    isAnswered: (value) => Array.isArray(value) && value.length > 0,
    validate: () => null,
    defaultAttachmentRule: () => makeAttachmentRule({ required: true, maxFiles: 5 }),
  },

  /* --------------------------- Penilaian ---------------------------- */
  rating: {
    ...numberBase,
    label: 'Skala penilaian',
    group: 'rating',
    supportsScoring: true,
    scoreOf: (value) => (isBlank(value) ? null : Number(value)),
    validate: (question, value) => {
      const max = question.validation?.max ?? 5;
      const num = Number(value);
      if (Number.isNaN(num)) return 'Pilih salah satu nilai.';
      if (num < 1 || num > max) return `Nilai berada di antara 1 dan ${max}.`;
      return null;
    },
  },
  score: {
    ...numberBase,
    label: 'Skor langsung',
    group: 'rating',
    supportsScoring: true,
    scoreOf: (value) => (isBlank(value) ? null : Number(value)),
  },

  /* ---------------------------- Khusus ------------------------------ */
  statement: {
    ...textBase,
    label: 'Pernyataan',
    group: 'special',
    isAnswered: () => true, // hanya informasi, tidak menuntut jawaban
    allowsAttachment: false,
    validate: () => null,
  },
  signature: {
    ...textBase,
    label: 'Tanda tangan',
    group: 'special',
    emptyValue: null,
    isAnswered: (value) => Boolean(value?.dataUrl),
    allowsAttachment: false,
    validate: () => null,
  },
  matrix: {
    ...textBase,
    label: 'Tabel',
    group: 'special',
    emptyValue: [],
    isAnswered: (value) => Array.isArray(value) && value.length > 0,
    validate: () => null,
  },
};

export const QUESTION_TYPE_GROUPS = [
  { id: 'text', label: 'Teks' },
  { id: 'choice', label: 'Pilihan' },
  { id: 'number', label: 'Angka' },
  { id: 'date', label: 'Tanggal' },
  { id: 'file', label: 'Berkas' },
  { id: 'rating', label: 'Penilaian' },
  { id: 'special', label: 'Khusus' },
];

/** Mengambil definisi tipe; melempar bila tipe tidak dikenal supaya salah ketik cepat ketahuan. */
export function getType(typeId) {
  const type = QUESTION_TYPES[typeId];
  if (!type) throw new Error(`Tipe pertanyaan tidak dikenal: ${typeId}`);
  return type;
}

export function typeExists(typeId) {
  return Boolean(QUESTION_TYPES[typeId]);
}

/** Daftar tipe untuk kotak perkakas builder, sudah dikelompokkan. */
export function listTypesByGroup() {
  return QUESTION_TYPE_GROUPS.map((group) => ({
    ...group,
    types: Object.entries(QUESTION_TYPES)
      .filter(([, def]) => def.group === group.id)
      .map(([id, def]) => ({ id, label: def.label })),
  }));
}
