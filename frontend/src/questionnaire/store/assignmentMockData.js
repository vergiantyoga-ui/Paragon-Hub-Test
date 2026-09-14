import { RESPONSE_STATUS } from '../engine/schema.js';

/**
 * Data contoh penugasan dan respons.
 *
 * Sengaja mencakup beberapa keadaan sekaligus: belum dimulai, sedang diisi
 * separuh, dan sudah terkirim. Dengan begitu portal pemasok maupun antrian
 * tinjauan punya isi sejak pertama dibuka, tanpa perlu menyiapkan data manual.
 */

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const daysAgo = (n) => daysFromNow(-n);

export const ASSIGNMENTS = [
  {
    id: 'asg_0001',
    versionId: 'ver_audit_v1',
    templateId: 'tpl_audit',
    supplierId: 'SUP-2026-0118',
    supplierName: 'PT Kimia Prima Lestari',
    supplierSite: 'Pulogadung, Jakarta Timur',
    materialCategory: 'Raw Material',
    materialName: 'Surfaktan dan emulsifier',
    dueDate: daysFromNow(21),
    reviewerId: 'usr-staff-1',
    reviewerName: 'Dewi Anggraini',
    priority: 'normal',
    instructions:
      'Mohon lampirkan sertifikat yang masih berlaku minimal 30 hari sejak tanggal pengisian.',
    assignedBy: 'Dewi Anggraini',
    assignedAt: daysAgo(6),
  },
  {
    id: 'asg_0002',
    versionId: 'ver_animal_v1',
    templateId: 'tpl_animal',
    supplierId: 'SUP-2026-0118',
    supplierName: 'PT Kimia Prima Lestari',
    supplierSite: 'Pulogadung, Jakarta Timur',
    materialCategory: 'Raw Material',
    materialName: 'Surfaktan nabati',
    dueDate: daysFromNow(5),
    reviewerId: 'usr-admin-1',
    reviewerName: 'Rangga Prasetyo',
    priority: 'high',
    instructions: '',
    assignedBy: 'Rangga Prasetyo',
    assignedAt: daysAgo(10),
  },
  {
    id: 'asg_0003',
    versionId: 'ver_audit_v1',
    templateId: 'tpl_audit',
    supplierId: 'SUP-2026-0131',
    supplierName: 'PT Karton Sejati Abadi',
    supplierSite: 'Genuk, Semarang',
    materialCategory: 'Packaging Material',
    materialName: 'Kotak dan karton',
    dueDate: daysFromNow(-2),
    reviewerId: 'usr-staff-1',
    reviewerName: 'Dewi Anggraini',
    priority: 'normal',
    instructions: '',
    assignedBy: 'Dewi Anggraini',
    assignedAt: daysAgo(30),
  },
  {
    // Sengaja lewat tenggat dan belum dikirim, supaya KPI keterlambatan dan
    // saringan "Terlambat" punya isi sejak pertama dibuka.
    id: 'asg_0004',
    versionId: 'ver_animal_v1',
    templateId: 'tpl_animal',
    supplierId: 'SUP-2026-0131',
    supplierName: 'PT Karton Sejati Abadi',
    supplierSite: 'Genuk, Semarang',
    materialCategory: 'Packaging Material',
    materialName: 'Tinta cetak kemasan',
    dueDate: daysFromNow(-9),
    reviewerId: 'usr-admin-1',
    reviewerName: 'Rangga Prasetyo',
    priority: 'high',
    instructions: 'Mohon segera dilengkapi, tenggat sudah terlewat.',
    assignedBy: 'Rangga Prasetyo',
    assignedAt: daysAgo(28),
  },
];

export const RESPONSES = [
  {
    id: 'res_0001',
    assignmentId: 'asg_0001',
    status: RESPONSE_STATUS.IN_PROGRESS,
    startedAt: daysAgo(4),
    submittedAt: null,
    answers: {
      q_audit_legal: 'PT Kimia Prima Lestari',
      q_audit_site: 'Kawasan Industri Pulogadung Blok C No. 9, Jakarta Timur',
      q_audit_employees: '148',
      q_audit_iso: 'yes',
    },
    attachments: {},
    revision: 1,
    reviews: [],
    history: [{ at: daysAgo(4), label: 'Pengisian dimulai', actor: 'Hendra Wijaya' }],
  },
  {
    id: 'res_0002',
    assignmentId: 'asg_0002',
    status: RESPONSE_STATUS.NOT_STARTED,
    startedAt: null,
    submittedAt: null,
    answers: {},
    attachments: {},
    revision: 1,
    reviews: [],
    history: [],
  },
  {
    id: 'res_0003',
    assignmentId: 'asg_0003',
    status: RESPONSE_STATUS.SUBMITTED,
    startedAt: daysAgo(20),
    submittedAt: daysAgo(3),
    answers: {
      q_audit_legal: 'PT Karton Sejati Abadi',
      q_audit_site: 'Jl. Raya Industri No. 88, Semarang',
      q_audit_employees: '76',
      q_audit_iso: 'no',
      q_audit_iso_plan:
        'Perusahaan sedang menyiapkan dokumentasi mutu dan menargetkan sertifikasi ISO 9001 pada kuartal kedua tahun depan.',
      q_audit_qms_doc: 'partial',
      q_audit_internal: 'yes',
      q_audit_capa: 'partial',
      q_audit_gmp: 'yes',
      q_audit_training: 'yes',
      q_audit_cross: 'partial',
      q_audit_gmp_score: 4,
      q_audit_halal: 'na',
      q_audit_animal: 'no',
    },
    attachments: {
      q_audit_qms_file: [
        {
          id: 'att_0001',
          fileName: 'manual-mutu-2026.pdf',
          fileType: 'application/pdf',
          fileSize: 1_820_400,
          expiryDate: null,
          uploadedAt: daysAgo(3),
        },
      ],
    },
    revision: 1,
    reviews: [],
    history: [
      { at: daysAgo(20), label: 'Pengisian dimulai', actor: 'Siti Aminah' },
      { at: daysAgo(3), label: 'Kuesioner dikirim', actor: 'Siti Aminah' },
    ],
  },
  {
    id: 'res_0004',
    assignmentId: 'asg_0004',
    status: RESPONSE_STATUS.IN_PROGRESS,
    startedAt: daysAgo(25),
    submittedAt: null,
    answers: { q_animal_company: 'PT Karton Sejati Abadi' },
    attachments: {},
    revision: 1,
    reviews: [],
    history: [{ at: daysAgo(25), label: 'Pengisian dimulai', actor: 'Siti Aminah' }],
  },
];

export const PRIORITIES = [
  { id: 'low', label: 'Rendah' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Tinggi' },
];

export const RESPONSE_STATUS_LABEL = {
  [RESPONSE_STATUS.NOT_STARTED]: 'Belum dimulai',
  [RESPONSE_STATUS.IN_PROGRESS]: 'Sedang diisi',
  [RESPONSE_STATUS.SUBMITTED]: 'Terkirim',
  [RESPONSE_STATUS.UNDER_REVIEW]: 'Sedang ditinjau',
  [RESPONSE_STATUS.REVISION_REQUIRED]: 'Perlu revisi',
  [RESPONSE_STATUS.APPROVED]: 'Disetujui',
  [RESPONSE_STATUS.REJECTED]: 'Ditolak',
  [RESPONSE_STATUS.EXPIRED]: 'Kedaluwarsa',
};

export const RESPONSE_STATUS_TONE = {
  [RESPONSE_STATUS.NOT_STARTED]: 'neutral',
  [RESPONSE_STATUS.IN_PROGRESS]: 'progress',
  [RESPONSE_STATUS.SUBMITTED]: 'pending',
  [RESPONSE_STATUS.UNDER_REVIEW]: 'pending',
  [RESPONSE_STATUS.REVISION_REQUIRED]: 'danger',
  [RESPONSE_STATUS.APPROVED]: 'success',
  [RESPONSE_STATUS.REJECTED]: 'danger',
  [RESPONSE_STATUS.EXPIRED]: 'danger',
};
