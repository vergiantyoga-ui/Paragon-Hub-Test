/**
 * Bentuk data mesin questionnaire.
 *
 * Proyek ini memakai JavaScript, bukan TypeScript. Sebagai gantinya bentuk
 * setiap entitas didefinisikan sebagai `@typedef` JSDoc — editor tetap memberi
 * autocomplete dan peringatan tipe, tanpa mengubah toolchain. Pemeriksaan yang
 * benar-benar menjaga data ada pada `assertShape()` di bawah, yang dipanggil
 * pada batas masuk data (memuat data contoh, mengimpor template).
 */

/* ------------------------------------------------------------------ */
/* Status                                                             */
/* ------------------------------------------------------------------ */

export const TEMPLATE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  ARCHIVED: 'archived',
};

export const RESPONSE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  REVISION_REQUIRED: 'revision_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

/** Tipe questionnaire tidak di-hardcode di kode; ini hanya daftar usulan awal. */
export const QUESTIONNAIRE_TYPES = [
  'Supplier Audit',
  'Compliance Statement',
  'Quality Assessment',
  'Regulatory Assessment',
  'Sustainability',
  'Other',
];

export const MATERIAL_TYPES = ['Raw Material', 'Packaging Material', 'Both', 'Not Applicable'];

/** Klasifikasi risiko bawaan; setiap versi boleh menimpanya. */
export const DEFAULT_RISK_BANDS = [
  { id: 'excellent', label: 'Excellent', min: 90, max: 100, risk: 'low' },
  { id: 'good', label: 'Good', min: 75, max: 89.99, risk: 'low' },
  { id: 'needs_improvement', label: 'Needs Improvement', min: 60, max: 74.99, risk: 'medium' },
  { id: 'high_risk', label: 'High Risk', min: 0, max: 59.99, risk: 'high' },
];

/* ------------------------------------------------------------------ */
/* Typedef                                                            */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} AttachmentRule
 * @property {boolean} required
 * @property {number} maxFiles
 * @property {number} maxFileSizeMb
 * @property {string[]} allowedTypes  MIME type yang diterima
 * @property {boolean} expiryDateRequired
 * @property {number|null} expiryMinDays  masa berlaku minimum tersisa, hari
 */

/**
 * @typedef {Object} QuestionOption
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {number} score
 * @property {boolean} excludeFromScoring  dipakai untuk pilihan N/A
 */

/**
 * Kondisi disimpan sebagai pohon agar dapat diserialisasi dan diuji.
 * @typedef {Object} ConditionLeaf
 * @property {string} questionId
 * @property {'equals'|'notEquals'|'in'|'notIn'|'answered'|'notAnswered'|'gt'|'lt'} operator
 * @property {*} [value]
 *
 * @typedef {{ all: Array<ConditionLeaf|ConditionNode> }
 *          | { any: Array<ConditionLeaf|ConditionNode> }} ConditionNode
 */

/**
 * @typedef {Object} QuestionValidation
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [minSelected]
 * @property {number} [maxSelected]
 * @property {string} [pattern]
 * @property {string} [patternMessage]
 */

/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} code
 * @property {string} text
 * @property {string} guidance
 * @property {string} type  kunci pada registri questionTypes
 * @property {boolean} required
 * @property {*} defaultValue
 * @property {string} placeholder
 * @property {string} helpText
 * @property {number} weight
 * @property {number} order
 * @property {QuestionOption[]} options
 * @property {ConditionNode|null} conditions
 * @property {QuestionValidation} validation
 * @property {AttachmentRule|null} attachmentRule
 * @property {string|null} libraryItemId  asal salinan, hanya untuk penelusuran
 */

/**
 * @typedef {Object} Section
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} order
 * @property {boolean} mandatory
 * @property {number} weight
 * @property {Question[]} questions
 */

/**
 * @typedef {Object} QuestionnaireVersion
 * @property {string} id
 * @property {string} templateId
 * @property {string} versionLabel
 * @property {'draft'|'published'|'unpublished'|'archived'} status
 * @property {string|null} effectiveDate
 * @property {string|null} expiryDate
 * @property {number|null} estimatedMinutes
 * @property {boolean} scoringEnabled
 * @property {number|null} passingScore
 * @property {Array<{id:string,label:string,min:number,max:number,risk:string}>} riskBands
 * @property {string|null} publishedAt
 * @property {string|null} publishedBy
 * @property {Section[]} sections
 */

/**
 * @typedef {Object} QuestionnaireTemplate
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} type
 * @property {string} description
 * @property {string} targetSupplierType
 * @property {string} materialType
 * @property {string} ownerId
 * @property {string} ownerName
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/* ------------------------------------------------------------------ */
/* Pembuat entitas kosong                                             */
/* ------------------------------------------------------------------ */

let counter = 0;
/** Pengenal lokal. Backend kelak menggantinya dengan uuid dari basis data. */
export function makeId(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** @returns {AttachmentRule} */
export function makeAttachmentRule(overrides = {}) {
  return {
    required: false,
    maxFiles: 1,
    maxFileSizeMb: 2,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    expiryDateRequired: false,
    expiryMinDays: null,
    ...overrides,
  };
}

/** @returns {QuestionOption} */
export function makeOption(overrides = {}) {
  return {
    id: makeId('opt'),
    label: '',
    value: '',
    score: 0,
    excludeFromScoring: false,
    ...overrides,
  };
}

/** @returns {Question} */
export function makeQuestion(overrides = {}) {
  return {
    id: makeId('q'),
    code: '',
    text: '',
    guidance: '',
    type: 'short_text',
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
    ...overrides,
  };
}

/** @returns {Section} */
export function makeSection(overrides = {}) {
  return {
    id: makeId('sec'),
    name: '',
    description: '',
    order: 0,
    mandatory: true,
    weight: 1,
    questions: [],
    ...overrides,
  };
}

/** @returns {QuestionnaireVersion} */
export function makeVersion(overrides = {}) {
  return {
    id: makeId('ver'),
    templateId: '',
    versionLabel: 'v1.0',
    status: TEMPLATE_STATUS.DRAFT,
    effectiveDate: null,
    expiryDate: null,
    estimatedMinutes: null,
    scoringEnabled: false,
    passingScore: null,
    riskBands: DEFAULT_RISK_BANDS,
    publishedAt: null,
    publishedBy: null,
    sections: [],
    ...overrides,
  };
}

/** @returns {QuestionnaireTemplate} */
export function makeTemplate(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId('tpl'),
    code: '',
    name: '',
    type: 'Other',
    description: '',
    targetSupplierType: 'Semua pemasok',
    materialType: 'Not Applicable',
    ownerId: '',
    ownerName: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Pemeriksaan bentuk pada batas data                                 */
/* ------------------------------------------------------------------ */

/**
 * Memeriksa keutuhan struktur sebuah versi: id yang ada dan unik, daftar yang
 * berbentuk array, serta kondisi yang tidak menunjuk pertanyaan tak dikenal.
 *
 * Sengaja TIDAK memeriksa kelengkapan isi seperti teks pertanyaan yang masih
 * kosong. Draf yang sedang disusun memang wajar setengah jadi, dan kesiapan
 * terbit adalah urusan `publishBlockers()`. Mencampur keduanya membuat builder
 * melaporkan "rusak" pada keadaan yang sebenarnya normal.
 *
 * Dipanggil pada batas masuk data — memuat data contoh, mengimpor template —
 * bukan pada setiap render.
 *
 * @param {QuestionnaireVersion} version
 * @returns {string[]} daftar masalah; kosong berarti struktur utuh
 */
export function assertShape(version) {
  const problems = [];
  const seenQuestionIds = new Set();

  if (!version?.id) problems.push('Versi tidak memiliki id.');
  if (!Array.isArray(version?.sections)) {
    problems.push('Versi tidak memiliki daftar seksi.');
    return problems;
  }

  version.sections.forEach((section, sIndex) => {
    if (!section.id) problems.push(`Seksi ke-${sIndex + 1} tidak memiliki id.`);
    if (!section.name) problems.push(`Seksi ke-${sIndex + 1} tidak memiliki nama.`);
    if (!Array.isArray(section.questions)) {
      problems.push(`Seksi "${section.name}" tidak memiliki daftar pertanyaan.`);
      return;
    }

    section.questions.forEach((question, qIndex) => {
      const where = `Pertanyaan ke-${qIndex + 1} pada seksi "${section.name}"`;

      if (!question.id) problems.push(`${where} tidak memiliki id.`);
      if (seenQuestionIds.has(question.id)) problems.push(`${where} memakai id ganda.`);
      seenQuestionIds.add(question.id);

      if (!question.type) problems.push(`${where} tidak memiliki tipe.`);
    });
  });

  // Kondisi hanya boleh menunjuk pertanyaan yang ada di versi yang sama.
  version.sections.forEach((section) => {
    section.questions.forEach((question) => {
      collectConditionRefs(question.conditions).forEach((ref) => {
        if (!seenQuestionIds.has(ref)) {
          problems.push(`Pertanyaan "${question.code || question.id}" merujuk pertanyaan tak dikenal: ${ref}.`);
        }
      });
    });
  });

  return problems;
}

/** Mengumpulkan seluruh questionId yang dirujuk sebuah pohon kondisi. */
export function collectConditionRefs(node) {
  if (!node) return [];
  if (node.all) return node.all.flatMap(collectConditionRefs);
  if (node.any) return node.any.flatMap(collectConditionRefs);
  return node.questionId ? [node.questionId] : [];
}

/**
 * Membekukan versi secara mendalam. Dipakai saat menerbitkan, sehingga aturan
 * "respons lama harus tetap menampilkan pertanyaan versi aslinya" dijamin oleh
 * struktur data, bukan sekadar disiplin penulis kode.
 */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
