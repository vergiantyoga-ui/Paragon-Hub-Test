import {
  DEFAULT_RISK_BANDS,
  TEMPLATE_STATUS,
  makeAttachmentRule,
} from '../engine/schema.js';

/**
 * Data contoh questionnaire.
 *
 * Tiga template dari spesifikasi bagian 25, dibuat dengan id tetap agar mudah
 * dirujuk saat pengujian. Supplier Audit memakai sebagian dari sebelas seksi
 * yang disebut spesifikasi — cukup untuk membuktikan mesinnya, tanpa membuat
 * berkas ini menjadi ratusan pertanyaan yang tidak menambah informasi.
 */

const pdfJpgPng = ['application/pdf', 'image/jpeg', 'image/png'];

const yesNoNa = (prefix) => [
  { id: `${prefix}_y`, label: 'Ya', value: 'yes', score: 4, excludeFromScoring: false },
  { id: `${prefix}_p`, label: 'Sebagian', value: 'partial', score: 2, excludeFromScoring: false },
  { id: `${prefix}_n`, label: 'Tidak', value: 'no', score: 0, excludeFromScoring: false },
  { id: `${prefix}_na`, label: 'Tidak berlaku', value: 'na', score: 0, excludeFromScoring: true },
];

const yesNo = (prefix) => [
  { id: `${prefix}_y`, label: 'Ya', value: 'yes', score: 4, excludeFromScoring: false },
  { id: `${prefix}_n`, label: 'Tidak', value: 'no', score: 0, excludeFromScoring: false },
];

/** Melengkapi pertanyaan ringkas menjadi bentuk penuh. */
function q(partial) {
  return {
    code: '',
    guidance: '',
    required: false,
    defaultValue: null,
    placeholder: '',
    helpText: '',
    weight: 1,
    order: 0,
    options: [],
    conditions: null,
    validation: {},
    attachmentRule: null,
    libraryItemId: null,
    ...partial,
  };
}

function section(partial) {
  return {
    description: '',
    mandatory: true,
    weight: 1,
    ...partial,
    questions: partial.questions.map((question, index) => ({ ...question, order: index })),
  };
}

/* ================================================================== */
/* Template 1 — Supplier Audit (skoring aktif)                        */
/* ================================================================== */

const auditV1 = {
  id: 'ver_audit_v1',
  templateId: 'tpl_audit',
  versionLabel: 'v1.0',
  status: TEMPLATE_STATUS.PUBLISHED,
  effectiveDate: '2026-01-01',
  expiryDate: null,
  estimatedMinutes: 45,
  scoringEnabled: true,
  passingScore: 75,
  riskBands: DEFAULT_RISK_BANDS,
  publishedAt: '2026-01-05T02:00:00.000Z',
  publishedBy: 'Dewi Anggraini',
  sections: [
    section({
      id: 'sec_audit_profile',
      name: 'Profil perusahaan',
      description: 'Identitas dan kapasitas fasilitas produksi.',
      order: 0,
      weight: 1,
      questions: [
        q({
          id: 'q_audit_legal',
          code: 'CP-01',
          text: 'Nama badan hukum perusahaan',
          type: 'short_text',
          required: true,
        }),
        q({
          id: 'q_audit_site',
          code: 'CP-02',
          text: 'Alamat lokasi produksi',
          type: 'long_text',
          required: true,
        }),
        q({
          id: 'q_audit_employees',
          code: 'CP-03',
          text: 'Jumlah karyawan tetap',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100000 },
        }),
        q({
          id: 'q_audit_iso',
          code: 'CP-04',
          text: 'Apakah perusahaan memiliki sertifikat ISO 9001 yang masih berlaku?',
          type: 'yes_no',
          required: true,
          weight: 2,
          options: yesNo('audit_iso'),
        }),
        q({
          id: 'q_audit_iso_doc',
          code: 'CP-05',
          text: 'Unggah sertifikat ISO 9001',
          type: 'file_single',
          required: true,
          guidance: 'Sertakan halaman yang memuat masa berlaku.',
          conditions: { all: [{ questionId: 'q_audit_iso', operator: 'equals', value: 'yes' }] },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFiles: 1,
            maxFileSizeMb: 5,
            allowedTypes: pdfJpgPng,
            expiryDateRequired: true,
            expiryMinDays: 30,
          }),
        }),
        q({
          id: 'q_audit_iso_plan',
          code: 'CP-06',
          text: 'Jelaskan rencana perusahaan untuk memperoleh sertifikasi mutu.',
          type: 'long_text',
          required: true,
          conditions: { all: [{ questionId: 'q_audit_iso', operator: 'equals', value: 'no' }] },
          validation: { minLength: 40 },
        }),
      ],
    }),

    section({
      id: 'sec_audit_qms',
      name: 'Sistem manajemen mutu',
      order: 1,
      weight: 2,
      questions: [
        q({
          id: 'q_audit_qms_doc',
          code: 'QMS-01',
          text: 'Apakah perusahaan memiliki sistem manajemen mutu terdokumentasi?',
          type: 'yes_no_na',
          required: true,
          weight: 3,
          options: yesNoNa('audit_qmsdoc'),
        }),
        q({
          id: 'q_audit_qms_file',
          code: 'QMS-02',
          text: 'Unggah manual mutu atau dokumen setara',
          type: 'file_single',
          required: true,
          conditions: {
            any: [
              { questionId: 'q_audit_qms_doc', operator: 'equals', value: 'yes' },
              { questionId: 'q_audit_qms_doc', operator: 'equals', value: 'partial' },
            ],
          },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFiles: 3,
            maxFileSizeMb: 10,
            allowedTypes: pdfJpgPng,
          }),
        }),
        q({
          id: 'q_audit_internal',
          code: 'QMS-03',
          text: 'Apakah audit internal dilaksanakan secara berkala?',
          type: 'yes_no_na',
          required: true,
          weight: 2,
          options: yesNoNa('audit_internal'),
        }),
        q({
          id: 'q_audit_capa',
          code: 'QMS-04',
          text: 'Apakah sistem CAPA diterapkan?',
          type: 'yes_no_na',
          required: true,
          weight: 2,
          options: yesNoNa('audit_capa'),
        }),
      ],
    }),

    section({
      id: 'sec_audit_gmp',
      name: 'GMP',
      order: 2,
      weight: 2,
      questions: [
        q({
          id: 'q_audit_gmp',
          code: 'GMP-01',
          text: 'Apakah prinsip GMP diterapkan pada seluruh lini produksi?',
          type: 'yes_no_na',
          required: true,
          weight: 3,
          options: yesNoNa('audit_gmp'),
        }),
        q({
          id: 'q_audit_training',
          code: 'GMP-02',
          text: 'Apakah pelatihan personel terdokumentasi?',
          type: 'yes_no_na',
          required: true,
          options: yesNoNa('audit_training'),
        }),
        q({
          id: 'q_audit_cross',
          code: 'GMP-03',
          text: 'Apakah risiko kontaminasi silang dikendalikan?',
          type: 'yes_no_na',
          required: true,
          weight: 2,
          options: yesNoNa('audit_cross'),
        }),
        q({
          id: 'q_audit_gmp_score',
          code: 'GMP-04',
          text: 'Nilai kebersihan area produksi menurut penilaian mandiri',
          type: 'rating',
          required: true,
          validation: { max: 5 },
        }),
      ],
    }),

    section({
      id: 'sec_audit_reg',
      name: 'Kepatuhan regulasi',
      order: 3,
      weight: 2,
      questions: [
        q({
          id: 'q_audit_halal',
          code: 'REG-01',
          text: 'Apakah produk memiliki sertifikat halal yang masih berlaku?',
          type: 'yes_no_na',
          required: true,
          options: yesNoNa('audit_halal'),
        }),
        q({
          id: 'q_audit_halal_doc',
          code: 'REG-02',
          text: 'Unggah sertifikat halal',
          type: 'file_single',
          required: true,
          conditions: { all: [{ questionId: 'q_audit_halal', operator: 'equals', value: 'yes' }] },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFileSizeMb: 5,
            allowedTypes: pdfJpgPng,
            expiryDateRequired: true,
            expiryMinDays: 60,
          }),
        }),
        q({
          id: 'q_audit_animal',
          code: 'REG-03',
          text: 'Apakah bahan mengandung turunan hewani?',
          type: 'yes_no',
          required: true,
          options: yesNo('audit_animal'),
        }),
        q({
          id: 'q_audit_statement',
          code: 'REG-04',
          text: 'Pernyataan kepatuhan terhadap peraturan kosmetika yang berlaku',
          type: 'statement',
          guidance:
            'Dengan mengirimkan kuesioner ini, pemasok menyatakan bahan yang dipasok memenuhi peraturan kosmetika yang berlaku di negara tujuan.',
        }),
      ],
    }),
  ],
};

/* ================================================================== */
/* Template 2 — Animal Free Statement (tanpa skoring)                 */
/* ================================================================== */

const animalV1 = {
  id: 'ver_animal_v1',
  templateId: 'tpl_animal',
  versionLabel: 'v1.0',
  status: TEMPLATE_STATUS.PUBLISHED,
  effectiveDate: '2026-02-01',
  expiryDate: null,
  estimatedMinutes: 10,
  scoringEnabled: false,
  passingScore: null,
  riskBands: DEFAULT_RISK_BANDS,
  publishedAt: '2026-02-03T03:00:00.000Z',
  publishedBy: 'Rangga Prasetyo',
  sections: [
    section({
      id: 'sec_animal_info',
      name: 'Informasi pemasok',
      order: 0,
      questions: [
        q({ id: 'q_animal_company', code: 'AF-01', text: 'Nama perusahaan', type: 'short_text', required: true }),
        q({ id: 'q_animal_material', code: 'AF-02', text: 'Nama bahan yang dideklarasikan', type: 'short_text', required: true }),
      ],
    }),

    section({
      id: 'sec_animal_decl',
      name: 'Deklarasi bahan hewani',
      order: 1,
      questions: [
        q({
          id: 'q_animal_contains',
          code: 'AF-03',
          text: 'Apakah bahan mengandung komponen turunan hewani?',
          type: 'yes_no',
          required: true,
          options: yesNo('animal_contains'),
        }),
        q({
          id: 'q_animal_source',
          code: 'AF-04',
          text: 'Sumber bahan hewani',
          type: 'short_text',
          required: true,
          conditions: { all: [{ questionId: 'q_animal_contains', operator: 'equals', value: 'yes' }] },
        }),
        q({
          id: 'q_animal_species',
          code: 'AF-05',
          text: 'Spesies hewan',
          type: 'short_text',
          required: true,
          conditions: { all: [{ questionId: 'q_animal_contains', operator: 'equals', value: 'yes' }] },
        }),
        q({
          id: 'q_animal_country',
          code: 'AF-06',
          text: 'Negara asal',
          type: 'short_text',
          required: true,
          conditions: { all: [{ questionId: 'q_animal_contains', operator: 'equals', value: 'yes' }] },
        }),
        q({
          id: 'q_animal_cert',
          code: 'AF-07',
          text: 'Unggah sertifikat pendukung asal hewani',
          type: 'file_single',
          required: true,
          conditions: { all: [{ questionId: 'q_animal_contains', operator: 'equals', value: 'yes' }] },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFileSizeMb: 5,
            allowedTypes: pdfJpgPng,
            expiryDateRequired: true,
          }),
        }),
        q({
          id: 'q_animal_free_doc',
          code: 'AF-08',
          text: 'Unggah surat pernyataan bebas bahan hewani',
          type: 'file_single',
          required: true,
          conditions: { all: [{ questionId: 'q_animal_contains', operator: 'equals', value: 'no' }] },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFileSizeMb: 5,
            allowedTypes: pdfJpgPng,
          }),
        }),
      ],
    }),

    section({
      id: 'sec_animal_sign',
      name: 'Pernyataan',
      order: 2,
      questions: [
        q({
          id: 'q_animal_valid',
          code: 'AF-09',
          text: 'Pernyataan ini berlaku sampai',
          type: 'date',
          required: true,
        }),
        q({
          id: 'q_animal_rep',
          code: 'AF-10',
          text: 'Nama perwakilan pemasok',
          type: 'short_text',
          required: true,
        }),
        q({
          id: 'q_animal_signature',
          code: 'AF-11',
          text: 'Tanda tangan perwakilan',
          type: 'signature',
          required: true,
          guidance: 'Bubuhkan tanda tangan pada kotak yang tersedia.',
        }),
      ],
    }),
  ],
};

/* ================================================================== */
/* Template 3 — Halal Compliance (draf, belum terbit)                 */
/* ================================================================== */

const halalV1 = {
  id: 'ver_halal_v1',
  templateId: 'tpl_halal',
  versionLabel: 'v1.0',
  status: TEMPLATE_STATUS.DRAFT,
  effectiveDate: null,
  expiryDate: null,
  estimatedMinutes: 15,
  scoringEnabled: false,
  passingScore: null,
  riskBands: DEFAULT_RISK_BANDS,
  publishedAt: null,
  publishedBy: null,
  sections: [
    section({
      id: 'sec_halal_info',
      name: 'Informasi pemasok',
      order: 0,
      questions: [
        q({ id: 'q_halal_company', code: 'HL-01', text: 'Nama perusahaan', type: 'short_text', required: true }),
        q({ id: 'q_halal_site', code: 'HL-02', text: 'Lokasi fasilitas produksi', type: 'short_text', required: true }),
      ],
    }),
    section({
      id: 'sec_halal_status',
      name: 'Status halal',
      order: 1,
      questions: [
        q({
          id: 'q_halal_certified',
          code: 'HL-03',
          text: 'Apakah bahan telah bersertifikat halal?',
          type: 'yes_no',
          required: true,
          options: yesNo('halal_certified'),
        }),
        q({
          id: 'q_halal_body',
          code: 'HL-04',
          text: 'Lembaga penerbit sertifikat',
          type: 'short_text',
          required: true,
          conditions: { all: [{ questionId: 'q_halal_certified', operator: 'equals', value: 'yes' }] },
        }),
        q({
          id: 'q_halal_cert',
          code: 'HL-05',
          text: 'Unggah sertifikat halal beserta masa berlakunya',
          type: 'file_single',
          required: true,
          conditions: { all: [{ questionId: 'q_halal_certified', operator: 'equals', value: 'yes' }] },
          attachmentRule: makeAttachmentRule({
            required: true,
            maxFileSizeMb: 5,
            allowedTypes: pdfJpgPng,
            expiryDateRequired: true,
            expiryMinDays: 90,
          }),
        }),
      ],
    }),
  ],
};

/* ================================================================== */

export const QUESTIONNAIRE_TEMPLATES = [
  {
    id: 'tpl_audit',
    code: 'QST-AUD',
    name: 'Supplier Audit',
    type: 'Supplier Audit',
    description:
      'Penilaian menyeluruh atas mutu, GMP, dan kepatuhan regulasi pemasok bahan baku.',
    targetSupplierType: 'Pemasok bahan baku',
    materialType: 'Raw Material',
    ownerId: 'usr-staff-1',
    ownerName: 'Dewi Anggraini',
    createdAt: '2025-12-20T04:00:00.000Z',
    updatedAt: '2026-01-05T02:00:00.000Z',
  },
  {
    id: 'tpl_animal',
    code: 'QST-AFS',
    name: 'Animal Free Statement',
    type: 'Compliance Statement',
    description: 'Deklarasi kandungan bahan turunan hewani beserta dokumen pendukungnya.',
    targetSupplierType: 'Semua pemasok',
    materialType: 'Both',
    ownerId: 'usr-admin-1',
    ownerName: 'Rangga Prasetyo',
    createdAt: '2026-01-28T04:00:00.000Z',
    updatedAt: '2026-02-03T03:00:00.000Z',
  },
  {
    id: 'tpl_halal',
    code: 'QST-HAL',
    name: 'Halal Compliance',
    type: 'Regulatory Assessment',
    description: 'Verifikasi status halal bahan dan keabsahan sertifikatnya.',
    targetSupplierType: 'Pemasok bahan baku',
    materialType: 'Raw Material',
    ownerId: 'usr-admin-1',
    ownerName: 'Rangga Prasetyo',
    createdAt: '2026-02-18T04:00:00.000Z',
    updatedAt: '2026-02-18T04:00:00.000Z',
  },
];

export const QUESTIONNAIRE_VERSIONS = [auditV1, animalV1, halalV1];

/** Pustaka soal yang dapat dipakai ulang lintas questionnaire. */
export const QUESTION_LIBRARY = [
  {
    id: 'lib_q_iso',
    category: 'Mutu',
    question: q({
      code: 'LIB-Q01',
      text: 'Apakah perusahaan memiliki sertifikat ISO 9001 yang masih berlaku?',
      type: 'yes_no',
      required: true,
      options: yesNo('lib_iso'),
    }),
  },
  {
    id: 'lib_q_capa',
    category: 'Mutu',
    question: q({
      code: 'LIB-Q02',
      text: 'Apakah sistem CAPA diterapkan?',
      type: 'yes_no_na',
      required: true,
      options: yesNoNa('lib_capa'),
    }),
  },
  {
    id: 'lib_q_audit',
    category: 'Mutu',
    question: q({
      code: 'LIB-Q03',
      text: 'Apakah audit internal dilaksanakan secara berkala?',
      type: 'yes_no_na',
      required: true,
      options: yesNoNa('lib_audit'),
    }),
  },
  {
    id: 'lib_q_halal',
    category: 'Regulasi',
    question: q({
      code: 'LIB-Q04',
      text: 'Apakah bahan memiliki sertifikat halal yang masih berlaku?',
      type: 'yes_no',
      required: true,
      options: yesNo('lib_halal'),
      attachmentRule: makeAttachmentRule({
        required: true,
        allowedTypes: pdfJpgPng,
        expiryDateRequired: true,
      }),
    }),
  },
  {
    id: 'lib_q_animal',
    category: 'Regulasi',
    question: q({
      code: 'LIB-Q05',
      text: 'Apakah bahan mengandung komponen turunan hewani?',
      type: 'yes_no',
      required: true,
      options: yesNo('lib_animal'),
    }),
  },
  {
    id: 'lib_q_env',
    category: 'Keberlanjutan',
    question: q({
      code: 'LIB-Q06',
      text: 'Apakah perusahaan menerapkan sistem manajemen lingkungan?',
      type: 'yes_no_na',
      required: false,
      options: yesNoNa('lib_env'),
    }),
  },
  {
    id: 'lib_q_recycled',
    category: 'Keberlanjutan',
    question: q({
      code: 'LIB-Q07',
      text: 'Berapa persen bahan daur ulang yang digunakan pada kemasan?',
      type: 'percentage',
      required: false,
      validation: { min: 0, max: 100 },
    }),
  },
];

/** Pustaka seksi siap pakai. */
export const SECTION_LIBRARY = [
  { id: 'lib_sec_company', name: 'Informasi perusahaan', questionIds: ['lib_q_iso'] },
  { id: 'lib_sec_quality', name: 'Manajemen mutu', questionIds: ['lib_q_iso', 'lib_q_capa', 'lib_q_audit'] },
  { id: 'lib_sec_reg', name: 'Kepatuhan regulasi', questionIds: ['lib_q_halal', 'lib_q_animal'] },
  { id: 'lib_sec_sustain', name: 'Keberlanjutan', questionIds: ['lib_q_env', 'lib_q_recycled'] },
];
