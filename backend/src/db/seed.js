import { getDb, migrate } from './connection.js';
import { hashPassword } from '../lib/password.js';
import { makeId, now } from '../lib/ids.js';
import * as users from '../repositories/userRepo.js';
import * as suppliers from '../repositories/supplierRepo.js';
import * as questionnaires from '../repositories/questionnaireRepo.js';
import * as responses from '../repositories/responseRepo.js';

import { INTERNAL_USERS, SUBMISSIONS } from '../../../frontend/src/lib/mockData.js';
import {
  QUESTIONNAIRE_TEMPLATES,
  QUESTIONNAIRE_VERSIONS,
  QUESTION_LIBRARY,
  SECTION_LIBRARY,
} from '../../../frontend/src/questionnaire/store/questionnaireMockData.js';
import {
  ASSIGNMENTS,
  RESPONSES,
} from '../../../frontend/src/questionnaire/store/assignmentMockData.js';
import {
  LEGAL_STATUSES,
  ENTITY_TYPES,
  VENDOR_TYPES,
  VENDOR_TYPE_DETAILS,
  OTV_STATUSES,
  VENDOR_DIRECT_TYPES,
  TRANSACTION_TYPES,
  CORPORATE_ENTITIES,
  TERMS_OF_PAYMENT,
  FISCAL_POSITIONS,
  ACCOUNT_TYPES,
  AGREEMENT_RATE_OPTIONS,
  BANKS,
  CURRENCIES,
  UNSPSC_SEGMENTS,
  UNSPSC_COMMODITIES,
  QUALIFICATION_COUNTRIES,
} from '../lib/masterData.js';

/**
 * Memuat data contoh ke basis data.
 *
 * Isinya diambil dari berkas data contoh front-end, bukan disalin ke sini.
 * Demo yang isinya berbeda dari yang dipakai pengujian front-end akan
 * menyimpang perlahan tanpa ada yang menyadarinya, dan dua daftar pemasok
 * contoh yang berbeda adalah sumber kebingungan yang tidak perlu.
 */

const DEFAULT_PASSWORD = 'Paragon#2026';

export function seed({ force = false } = {}) {
  const db = getDb();
  migrate(db);

  const existing = db.prepare('SELECT COUNT(*) AS total FROM supplier').get().total;
  if (existing > 0 && !force) {
    return { inserted: false, summary: 'basis data sudah berisi data' };
  }

  if (force) clear(db);

  seedMasterData();
  seedUsers();
  seedSuppliers();
  seedQuestionnaires();

  const summary = [
    `${INTERNAL_USERS.length} pengguna internal`,
    `${SUBMISSIONS.length} pengajuan pemasok`,
    `${QUESTIONNAIRE_TEMPLATES.length} template kuesioner`,
    `${ASSIGNMENTS.length} penugasan`,
  ].join(', ');

  return { inserted: true, summary };
}

function clear(db) {
  const tables = [
    'audit_log',
    'notification',
    'response_history',
    'response_revision',
    'questionnaire_comment',
    'questionnaire_review',
    'answer_attachment',
    'questionnaire_answer',
    'questionnaire_response',
    'questionnaire_assignment',
    'section_library_item',
    'question_library_item',
    'attachment_rule',
    'question_option',
    'question',
    'questionnaire_section',
    'questionnaire_risk_band',
    'questionnaire_version',
    'questionnaire_template',
    'qualification_line',
    'qualification',
    'supplier_document',
    'supplier_bank_account',
    'supplier_contact_person',
    'supplier_profile_section',
    'supplier_timeline',
    'supplier_preferred_decision',
    'supplier_verification_note',
    'supplier_verification',
    'supplier_consent',
    'supplier_internal_draft',
    'supplier_account',
    'supplier_pic',
    'supplier_address',
    'supplier_corporate_code',
    'supplier_target_company',
    'supplier_general',
    'supplier',
    'internal_user',
    'master_data',
  ];
  const run = db.transaction(() => {
    for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();
  });
  run();
}

/* ---------------------------- Master data ---------------------------- */

function seedMasterData() {
  users.upsertMaster('legal_status', LEGAL_STATUSES);
  users.upsertMaster('entity_type', ENTITY_TYPES);
  users.upsertMaster('vendor_type', VENDOR_TYPES);
  // Kode rincian berulang antar jenis pasokan ('0001' ada pada Packaging dan
  // Raw), jadi kuncinya digabung dengan induknya. Kode aslinya tetap disimpan
  // pada `detailCode` supaya nilai yang tersimpan di profil tidak berubah.
  users.upsertMaster(
    'vendor_type_detail',
    VENDOR_TYPE_DETAILS.map((item) => ({
      code: `${item.filterBy}:${item.code}`,
      name: item.name,
      parentCode: item.filterBy,
      detailCode: item.code,
    })),
  );
  users.upsertMaster('otv_status', OTV_STATUSES);
  users.upsertMaster('vendor_direct_type', VENDOR_DIRECT_TYPES);
  users.upsertMaster('transaction_type', TRANSACTION_TYPES);
  users.upsertMaster(
    'corporate_company',
    CORPORATE_ENTITIES.map((item) => ({
      code: item.code,
      name: item.name,
      uiName: item.interfaceName,
    })),
  );
  users.upsertMaster('terms_of_payment', TERMS_OF_PAYMENT);
  users.upsertMaster('fiscal_position', FISCAL_POSITIONS);
  users.upsertMaster('account_type', ACCOUNT_TYPES);
  users.upsertMaster('agreement_rate', AGREEMENT_RATE_OPTIONS);
  users.upsertMaster('bank', BANKS);
  users.upsertMaster(
    'currency',
    CURRENCIES.map((code) => ({ code, name: code })),
  );
  users.upsertMaster('unspsc_segment', UNSPSC_SEGMENTS);
  users.upsertMaster(
    'unspsc_commodity',
    UNSPSC_COMMODITIES.map((item) => ({ ...item, parentCode: item.segment })),
  );
  users.upsertMaster('country', QUALIFICATION_COUNTRIES);
}

/* ------------------------------ Pengguna ----------------------------- */

function seedUsers() {
  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  for (const user of INTERNAL_USERS) users.saveUser({ ...user, passwordHash });
}

/* ------------------------------ Pemasok ------------------------------ */

function seedSuppliers() {
  const db = getDb();
  const passwordHash = hashPassword(DEFAULT_PASSWORD);

  for (const submission of SUBMISSIONS) {
    suppliers.save(submission);

    // Hash kata sandi tidak ikut pada data contoh front-end; dipasang di sini
    // supaya DEMO_AUTH dapat dimatikan tanpa mengunci seluruh akun demo.
    if (submission.account?.passwordChanged) {
      db.prepare('UPDATE supplier_account SET password_hash = ? WHERE supplier_id = ?').run(
        passwordHash,
        submission.id,
      );
    }
  }
}

/* --------------------------- Questionnaire --------------------------- */

function seedQuestionnaires() {
  for (const template of QUESTIONNAIRE_TEMPLATES) questionnaires.saveTemplate(template);
  for (const version of QUESTIONNAIRE_VERSIONS) questionnaires.saveVersion(version);

  for (const item of QUESTION_LIBRARY) questionnaires.saveQuestionLibraryItem(item);
  for (const item of SECTION_LIBRARY) questionnaires.saveSectionLibraryItem(item);

  for (const assignment of ASSIGNMENTS) responses.saveAssignment(assignment);
  for (const response of RESPONSES) {
    responses.saveResponse(response);
    if (response.submittedAt) {
      responses.recordRevision(response.id, response.revision ?? 1, {
        answers: response.answers,
        attachments: response.attachments,
        submittedAt: response.submittedAt,
      });
    }
  }

  getDb()
    .prepare(
      `INSERT INTO audit_log (id, actor_id, actor_name, action, object_type, object_id, at)
       VALUES (?, NULL, 'Sistem', 'db.seeded', 'system', NULL, ?)`,
    )
    .run(makeId('log'), now());
}

export { DEFAULT_PASSWORD };
