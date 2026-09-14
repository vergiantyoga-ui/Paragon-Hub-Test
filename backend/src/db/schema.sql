-- =====================================================================
-- Paragon Supply Collaboration Hub — skema SQLite
-- ---------------------------------------------------------------------
-- Tiga rumpun tabel:
--   1. Registrasi & profil pemasok   (supplier_*)
--   2. Kualifikasi komoditas          (qualification_*)
--   3. Mesin questionnaire            (questionnaire_*, question*, response*)
-- Ditambah master data, notifikasi, dan jejak audit.
--
-- Catatan bentuk data: bagian profil yang isian-nya berevolusi mengikuti
-- formulir (tax, documents, licenses, banking header) disimpan sebagai
-- dokumen JSON pada `supplier_profile_section`. Yang berulang dan memang
-- perlu di-query — kontak, rekening bank, berkas — tetap dipecah ke tabel
-- sendiri. Lihat README bagian "Keputusan rancangan basis data".
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Meta
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- Master data — satu tabel untuk seluruh daftar kode
-- ---------------------------------------------------------------------
-- domain: legal_status | entity_type | vendor_type | vendor_type_detail |
--         transaction_type | corporate_company | bank | currency |
--         terms_of_payment | account_type | fiscal_position |
--         unspsc_segment | unspsc_commodity | country
CREATE TABLE IF NOT EXISTS master_data (
  domain      TEXT NOT NULL,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  parent_code TEXT,
  extra_json  TEXT NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (domain, code)
);

CREATE INDEX IF NOT EXISTS idx_master_parent ON master_data (domain, parent_code);

-- ---------------------------------------------------------------------
-- Pengguna internal
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_user (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  -- Nilai mengikuti `ROLE` pada frontend/src/lib/constants.js.
  role          TEXT NOT NULL CHECK (role IN ('procurement_staff', 'procurement_admin', 'procurement_manager')),
  password_hash TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- Pemasok — inti pengajuan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier (
  id                          TEXT PRIMARY KEY,
  status                      TEXT NOT NULL,
  submitted_at                TEXT,
  decided_at                  TEXT,
  reject_reason               TEXT,
  onboarding_path             TEXT CHECK (onboarding_path IN ('invite', 'internal') OR onboarding_path IS NULL),
  document_source             TEXT,
  registered_at               TEXT,
  edit_rights_transferred_at  TEXT,
  preferred_submitted_at      TEXT,
  preferred_submitted_by      TEXT,
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier (status);

-- Data Umum
CREATE TABLE IF NOT EXISTS supplier_general (
  supplier_id        TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  legal_status       TEXT,
  entity_type        TEXT,
  vendor_name        TEXT,
  vendor_type        TEXT,
  vendor_type_detail TEXT,
  otv_status         TEXT,
  vendor_direct_type TEXT,
  company_email      TEXT,
  office_phone       TEXT,
  mobile_phone       TEXT,
  website            TEXT,
  extra_json         TEXT NOT NULL DEFAULT '{}'
);

-- Perusahaan Paragon yang dituju (nama antarmuka)
CREATE TABLE IF NOT EXISTS supplier_target_company (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  ui_name     TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Kode korporat hasil pemetaan ui_name → ID01..ID06 / MY01, dikirim ke SAP
CREATE TABLE IF NOT EXISTS supplier_corporate_code (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  UNIQUE (supplier_id, code)
);

CREATE TABLE IF NOT EXISTS supplier_address (
  supplier_id TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  street      TEXT,
  country     TEXT,
  province    TEXT,
  city        TEXT,
  district    TEXT,
  subdistrict TEXT,
  postal_code TEXT,
  extra_json  TEXT NOT NULL DEFAULT '{}'
);

-- PIC pendaftaran (satu orang, berbeda dari daftar kontak pada profil)
CREATE TABLE IF NOT EXISTS supplier_pic (
  supplier_id TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  position    TEXT,
  extra_json  TEXT NOT NULL DEFAULT '{}'
);

-- Akun portal pemasok
CREATE TABLE IF NOT EXISTS supplier_account (
  supplier_id        TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  account_id         TEXT NOT NULL UNIQUE,
  password_hash      TEXT,
  temporary_password TEXT,
  invite_token       TEXT,
  email_sent_at      TEXT,
  password_changed   INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_internal_draft (
  supplier_id  TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  started_at   TEXT,
  filled_by    TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS supplier_consent (
  supplier_id               TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  gtc_accepted_at           TEXT,
  data_accuracy_accepted_at TEXT,
  accepted_by               TEXT,
  version                   TEXT,
  path                      TEXT
);

CREATE TABLE IF NOT EXISTS supplier_verification (
  supplier_id           TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  status                TEXT,
  verified_at           TEXT,
  verified_by           TEXT,
  requested_at          TEXT,
  requested_by          TEXT,
  triggered_by_section  TEXT
);

CREATE TABLE IF NOT EXISTS supplier_verification_note (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supplier_preferred_decision (
  supplier_id TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  decision    TEXT NOT NULL CHECK (decision IN ('approved', 'disqualified')),
  note        TEXT,
  decided_at  TEXT,
  decided_by  TEXT
);

CREATE TABLE IF NOT EXISTS supplier_timeline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  at          TEXT NOT NULL,
  label       TEXT NOT NULL,
  actor       TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_timeline_supplier ON supplier_timeline (supplier_id, order_index);

-- ---------------------------------------------------------------------
-- Profil lima bagian
-- ---------------------------------------------------------------------
-- section_id: tax | documents | licenses | banking | contacts
CREATE TABLE IF NOT EXISTS supplier_profile_section (
  supplier_id TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  section_id  TEXT NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0,
  filled_by   TEXT,
  data_json   TEXT NOT NULL DEFAULT '{}',
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (supplier_id, section_id)
);

-- Kontak perusahaan (maksimal 10, satu kontak utama)
-- Kuncinya gabungan: pengenal kontak hanya unik di dalam satu pemasok.
CREATE TABLE IF NOT EXISTS supplier_contact_person (
  id           TEXT NOT NULL,
  supplier_id  TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  name         TEXT,
  title        TEXT,
  job_position TEXT,
  email        TEXT,
  phone        TEXT,
  mobile       TEXT,
  notes        TEXT,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  order_index  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id)
);

CREATE INDEX IF NOT EXISTS idx_contact_supplier ON supplier_contact_person (supplier_id);

-- Rekening bank. BIC dan negara sengaja tidak disimpan: keduanya turunan
-- dari bank_code dan dibaca dari master_data saat ditampilkan.
CREATE TABLE IF NOT EXISTS supplier_bank_account (
  id             TEXT NOT NULL,
  supplier_id    TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  account_type   TEXT,
  bank_code      TEXT,
  account_number TEXT,
  account_holder TEXT,
  order_index    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id),
  -- Rekening dengan nomor sama pada bank yang sama ditolak basis data juga,
  -- bukan hanya oleh validasi formulir.
  UNIQUE (supplier_id, bank_code, account_number)
);

-- Seluruh metadata berkas di semua bagian profil.
-- slot contoh: 'tax.ktpDocument', 'tax.documents.siup', 'documents.nib',
--              'licenses.gmp', 'banking.lines.<id>.statement'
CREATE TABLE IF NOT EXISTS supplier_document (
  id           TEXT PRIMARY KEY,
  supplier_id  TEXT NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
  section_id   TEXT NOT NULL,
  slot         TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INTEGER,
  file_type    TEXT,
  number       TEXT,
  valid_from   TEXT,
  valid_until  TEXT,
  uploaded_at  TEXT NOT NULL,
  UNIQUE (supplier_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_document_supplier ON supplier_document (supplier_id, section_id);

-- ---------------------------------------------------------------------
-- Kualifikasi komoditas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qualification (
  supplier_id TEXT PRIMARY KEY REFERENCES supplier (id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);

CREATE TABLE IF NOT EXISTS qualification_line (
  id             TEXT PRIMARY KEY,
  supplier_id    TEXT NOT NULL REFERENCES qualification (supplier_id) ON DELETE CASCADE,
  segment_code   TEXT,
  commodity_code TEXT,
  country_code   TEXT,
  notes          TEXT,
  order_index    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_qline_supplier ON qualification_line (supplier_id, order_index);

-- ---------------------------------------------------------------------
-- Questionnaire — template & versi
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire_template (
  id                   TEXT PRIMARY KEY,
  code                 TEXT NOT NULL,
  name                 TEXT NOT NULL,
  type                 TEXT,
  description          TEXT,
  target_supplier_type TEXT,
  material_type        TEXT,
  owner_id             TEXT,
  owner_name           TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questionnaire_version (
  id                TEXT PRIMARY KEY,
  template_id       TEXT NOT NULL REFERENCES questionnaire_template (id) ON DELETE CASCADE,
  version_label     TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),
  effective_date    TEXT,
  expiry_date       TEXT,
  estimated_minutes INTEGER,
  scoring_enabled   INTEGER NOT NULL DEFAULT 0,
  passing_score     REAL,
  published_at      TEXT,
  published_by      TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (template_id, version_label)
);

CREATE INDEX IF NOT EXISTS idx_version_template ON questionnaire_version (template_id);

CREATE TABLE IF NOT EXISTS questionnaire_risk_band (
  id          TEXT NOT NULL,
  version_id  TEXT NOT NULL REFERENCES questionnaire_version (id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  min_score   REAL NOT NULL,
  max_score   REAL NOT NULL,
  risk        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (version_id, id)
);

CREATE TABLE IF NOT EXISTS questionnaire_section (
  id          TEXT PRIMARY KEY,
  version_id  TEXT NOT NULL REFERENCES questionnaire_version (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  mandatory   INTEGER NOT NULL DEFAULT 1,
  weight      REAL NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_section_version ON questionnaire_section (version_id, order_index);

CREATE TABLE IF NOT EXISTS question (
  id              TEXT PRIMARY KEY,
  section_id      TEXT NOT NULL REFERENCES questionnaire_section (id) ON DELETE CASCADE,
  code            TEXT,
  text            TEXT NOT NULL,
  guidance        TEXT,
  type            TEXT NOT NULL,
  required        INTEGER NOT NULL DEFAULT 0,
  default_value   TEXT,
  placeholder     TEXT,
  help_text       TEXT,
  weight          REAL NOT NULL DEFAULT 1,
  order_index     INTEGER NOT NULL DEFAULT 0,
  conditions_json TEXT,
  validation_json TEXT NOT NULL DEFAULT '{}',
  library_item_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_question_section ON question (section_id, order_index);

CREATE TABLE IF NOT EXISTS question_option (
  id                   TEXT PRIMARY KEY,
  question_id          TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
  label                TEXT,
  value                TEXT,
  score                REAL NOT NULL DEFAULT 0,
  exclude_from_scoring INTEGER NOT NULL DEFAULT 0,
  order_index          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_option_question ON question_option (question_id, order_index);

CREATE TABLE IF NOT EXISTS attachment_rule (
  question_id          TEXT PRIMARY KEY REFERENCES question (id) ON DELETE CASCADE,
  required             INTEGER NOT NULL DEFAULT 0,
  max_files            INTEGER NOT NULL DEFAULT 1,
  max_file_size_mb     REAL NOT NULL DEFAULT 2,
  allowed_types_json   TEXT NOT NULL DEFAULT '[]',
  expiry_date_required INTEGER NOT NULL DEFAULT 0,
  expiry_min_days      INTEGER
);

-- ---------------------------------------------------------------------
-- Pustaka soal & seksi — sumber salinan, sengaja tanpa FK ke versi
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_library_item (
  id           TEXT PRIMARY KEY,
  category     TEXT,
  label        TEXT,
  payload_json TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS section_library_item (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  payload_json TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- Penugasan & respons
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire_assignment (
  id                TEXT PRIMARY KEY,
  version_id        TEXT NOT NULL REFERENCES questionnaire_version (id),
  template_id       TEXT REFERENCES questionnaire_template (id),
  supplier_id       TEXT NOT NULL,
  supplier_name     TEXT,
  supplier_site     TEXT,
  material_category TEXT,
  material_name     TEXT,
  due_date          TEXT,
  reviewer_id       TEXT,
  reviewer_name     TEXT,
  priority          TEXT NOT NULL DEFAULT 'normal',
  instructions      TEXT,
  assigned_by       TEXT,
  assigned_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignment_supplier ON questionnaire_assignment (supplier_id);
CREATE INDEX IF NOT EXISTS idx_assignment_reviewer ON questionnaire_assignment (reviewer_id);

CREATE TABLE IF NOT EXISTS questionnaire_response (
  id                TEXT PRIMARY KEY,
  assignment_id     TEXT NOT NULL UNIQUE REFERENCES questionnaire_assignment (id) ON DELETE CASCADE,
  status            TEXT NOT NULL,
  started_at        TEXT,
  submitted_at      TEXT,
  completion_percent REAL,
  score             REAL,
  risk_level        TEXT,
  revision          INTEGER NOT NULL DEFAULT 1,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_response_status ON questionnaire_response (status);

CREATE TABLE IF NOT EXISTS questionnaire_answer (
  id          TEXT PRIMARY KEY,
  response_id TEXT NOT NULL REFERENCES questionnaire_response (id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value_json  TEXT,
  skipped     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL,
  UNIQUE (response_id, question_id)
);

CREATE TABLE IF NOT EXISTS answer_attachment (
  id          TEXT PRIMARY KEY,
  answer_id   TEXT NOT NULL REFERENCES questionnaire_answer (id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_size   INTEGER,
  file_type   TEXT,
  expiry_date TEXT,
  uploaded_at TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questionnaire_review (
  id                  TEXT PRIMARY KEY,
  response_id         TEXT NOT NULL REFERENCES questionnaire_response (id) ON DELETE CASCADE,
  decision            TEXT NOT NULL,
  reviewer_id         TEXT,
  reviewer_name       TEXT,
  note                TEXT,
  revision            INTEGER NOT NULL DEFAULT 1,
  -- Salinan jawaban saat ditinjau. Inilah pembanding yang dipakai untuk
  -- menolak pengiriman ulang yang jawabannya tidak benar-benar berubah.
  answer_snapshot_json TEXT NOT NULL DEFAULT '{}',
  at                  TEXT NOT NULL,
  order_index         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_review_response ON questionnaire_review (response_id, order_index);

-- Pertanyaan yang ditandai perlu diperbaiki, satu baris per pertanyaan
-- kind = 'flag' (pertanyaan yang wajib diperbaiki) | 'comment' (catatan bebas)
CREATE TABLE IF NOT EXISTS questionnaire_comment (
  id           TEXT PRIMARY KEY,
  response_id  TEXT NOT NULL REFERENCES questionnaire_response (id) ON DELETE CASCADE,
  review_id    TEXT REFERENCES questionnaire_review (id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'flag' CHECK (kind IN ('flag', 'comment')),
  question_id  TEXT,
  note         TEXT,
  revision     INTEGER NOT NULL DEFAULT 1,
  resolved     INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  order_index  INTEGER NOT NULL DEFAULT 0,
  at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comment_response ON questionnaire_comment (response_id);

-- Riwayat putaran revisi, tidak pernah dihapus
CREATE TABLE IF NOT EXISTS response_revision (
  id            TEXT PRIMARY KEY,
  response_id   TEXT NOT NULL REFERENCES questionnaire_response (id) ON DELETE CASCADE,
  revision      INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  at            TEXT NOT NULL,
  UNIQUE (response_id, revision)
);

CREATE TABLE IF NOT EXISTS response_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id TEXT NOT NULL REFERENCES questionnaire_response (id) ON DELETE CASCADE,
  at          TEXT NOT NULL,
  label       TEXT NOT NULL,
  actor       TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- Notifikasi & jejak audit
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification (
  id         TEXT PRIMARY KEY,
  event      TEXT NOT NULL,
  audience   TEXT NOT NULL CHECK (audience IN ('internal', 'supplier')),
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_audience ON notification (audience, read);

CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  actor_id       TEXT,
  actor_name     TEXT,
  action         TEXT NOT NULL,
  object_type    TEXT NOT NULL,
  object_id      TEXT,
  previous_value TEXT,
  new_value      TEXT,
  at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_object ON audit_log (object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at);
