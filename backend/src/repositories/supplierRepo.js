import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';
import { parseJson, toBool, toInt, toJson } from '../lib/json.js';
import { corporateCodesFor } from '../lib/masterData.js';

/**
 * Pemetaan antara bentuk pengajuan yang dipakai antarmuka (satu objek
 * bersarang) dan tabel-tabel yang menyimpannya.
 *
 * Kenapa dipetakan, bukan disimpan sebagai satu kolom JSON: status, kontak,
 * rekening, dan berkas adalah hal yang akan di-query lintas pemasok — antrian
 * verifikasi, laporan rekening ganda, dokumen yang akan kedaluwarsa. Yang
 * tetap berbentuk JSON hanyalah isian formulir yang bentuknya masih berubah
 * (`supplier_profile_section.data_json`), dan itu pun setelah baris berulang
 * serta metadata berkasnya dikeluarkan ke tabel sendiri.
 */

const PROFILE_SECTIONS = ['tax', 'documents', 'licenses', 'banking', 'contacts'];

/* ------------------------------------------------------------------ */
/* Membaca                                                            */
/* ------------------------------------------------------------------ */

export function findAll() {
  const db = getDb();
  const rows = db.prepare('SELECT id FROM supplier ORDER BY submitted_at DESC, rowid DESC').all();
  return rows.map((row) => findById(row.id));
}

export function findById(id) {
  const db = getDb();
  const core = db.prepare('SELECT * FROM supplier WHERE id = ?').get(id);
  if (!core) return null;

  const general = db.prepare('SELECT * FROM supplier_general WHERE supplier_id = ?').get(id);
  const address = db.prepare('SELECT * FROM supplier_address WHERE supplier_id = ?').get(id);
  const pic = db.prepare('SELECT * FROM supplier_pic WHERE supplier_id = ?').get(id);
  const account = db.prepare('SELECT * FROM supplier_account WHERE supplier_id = ?').get(id);
  const consent = db.prepare('SELECT * FROM supplier_consent WHERE supplier_id = ?').get(id);
  const verification = db
    .prepare('SELECT * FROM supplier_verification WHERE supplier_id = ?')
    .get(id);
  const preferred = db
    .prepare('SELECT * FROM supplier_preferred_decision WHERE supplier_id = ?')
    .get(id);
  const draft = db.prepare('SELECT * FROM supplier_internal_draft WHERE supplier_id = ?').get(id);

  const targets = db
    .prepare(
      'SELECT ui_name FROM supplier_target_company WHERE supplier_id = ? ORDER BY order_index',
    )
    .all(id)
    .map((row) => row.ui_name);

  const notes = db
    .prepare('SELECT note FROM supplier_verification_note WHERE supplier_id = ? ORDER BY order_index')
    .all(id)
    .map((row) => row.note);

  const timeline = db
    .prepare('SELECT at, label, actor FROM supplier_timeline WHERE supplier_id = ? ORDER BY order_index')
    .all(id);

  return {
    id: core.id,
    status: core.status,
    submittedAt: core.submitted_at,
    decidedAt: core.decided_at ?? undefined,
    rejectReason: core.reject_reason ?? undefined,
    onboardingPath: core.onboarding_path,
    documentSource: core.document_source ?? undefined,
    registeredAt: core.registered_at ?? undefined,
    editRightsTransferredAt: core.edit_rights_transferred_at ?? undefined,
    preferredSubmittedAt: core.preferred_submitted_at ?? undefined,
    preferredSubmittedBy: core.preferred_submitted_by ?? undefined,

    general: general
      ? {
          legalStatus: general.legal_status ?? '',
          entityType: general.entity_type ?? '',
          vendorName: general.vendor_name ?? '',
          vendorType: general.vendor_type ?? '',
          vendorTypeDetail: general.vendor_type_detail ?? '',
          targetCompanies: targets,
          otvStatus: general.otv_status ?? '',
          vendorDirectType: general.vendor_direct_type ?? '',
          companyEmail: general.company_email ?? '',
          officePhone: general.office_phone ?? '',
          mobilePhone: general.mobile_phone ?? '',
          website: general.website ?? '',
          ...parseJson(general.extra_json, {}),
        }
      : null,

    address: address
      ? {
          street: address.street ?? '',
          country: address.country ?? '',
          province: address.province ?? '',
          city: address.city ?? '',
          district: address.district ?? '',
          subdistrict: address.subdistrict ?? '',
          postalCode: address.postal_code ?? '',
          ...parseJson(address.extra_json, {}),
        }
      : null,

    contact: pic
      ? {
          name: pic.name ?? '',
          email: pic.email ?? '',
          phone: pic.phone ?? '',
          // Kolom yang memang kosong di sumbernya tidak dimunculkan kembali
          // sebagai string kosong; bentuk yang dibaca harus sama persis
          // dengan yang disimpan.
          ...(pic.position !== null ? { position: pic.position } : {}),
          ...parseJson(pic.extra_json, {}),
        }
      : null,

    profile: readProfile(id),

    account: account
      ? {
          accountId: account.account_id,
          temporaryPassword: account.temporary_password ?? undefined,
          inviteToken: account.invite_token,
          emailSentAt: account.email_sent_at,
          passwordChanged: toBool(account.password_changed),
        }
      : null,

    internalDraft: draft
      ? {
          startedAt: draft.started_at,
          filledBy: draft.filled_by,
          ...(draft.completed_at ? { completedAt: draft.completed_at } : {}),
        }
      : undefined,

    consent: consent
      ? {
          gtcAcceptedAt: consent.gtc_accepted_at,
          dataAccuracyAcceptedAt: consent.data_accuracy_accepted_at,
          acceptedBy: consent.accepted_by,
          version: consent.version,
          path: consent.path,
        }
      : null,

    verification: verification
      ? {
          status: verification.status,
          ...(verification.verified_at ? { verifiedAt: verification.verified_at } : {}),
          ...(verification.verified_by ? { verifiedBy: verification.verified_by } : {}),
          ...(verification.requested_at ? { requestedAt: verification.requested_at } : {}),
          ...(verification.requested_by ? { requestedBy: verification.requested_by } : {}),
          ...(verification.triggered_by_section
            ? { triggeredBySection: verification.triggered_by_section }
            : {}),
          notes,
        }
      : null,

    preferredDecision: preferred
      ? {
          decision: preferred.decision,
          note: preferred.note,
          decidedAt: preferred.decided_at,
          decidedBy: preferred.decided_by,
        }
      : null,

    timeline,
  };
}

function readProfile(supplierId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM supplier_profile_section WHERE supplier_id = ?')
    .all(supplierId);

  const profile = { completed: {} };
  const filledBy = {};
  for (const section of PROFILE_SECTIONS) profile.completed[section] = false;

  for (const row of rows) {
    profile[row.section_id] = parseJson(row.data_json, {});
    profile.completed[row.section_id] = toBool(row.completed);
    if (row.filled_by) filledBy[row.section_id] = row.filled_by;
  }
  if (Object.keys(filledBy).length) profile.filledBy = filledBy;

  // Baris berulang dibaca dari tabelnya sendiri, bukan dari data_json.
  const contacts = db
    .prepare('SELECT * FROM supplier_contact_person WHERE supplier_id = ? ORDER BY order_index')
    .all(supplierId);
  if (contacts.length || profile.contacts) {
    // Kolom yang memang tidak ada saat disimpan tidak dimunculkan kembali
    // sebagai string kosong — bentuk yang dibaca harus sama dengan yang ditulis.
    profile.contacts = contacts.map((row) =>
      omitNull({
        id: row.id,
        name: row.name,
        title: row.title,
        jobPosition: row.job_position,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        notes: row.notes,
        isPrimary: toBool(row.is_primary),
      }),
    );
  }

  const documents = db
    .prepare('SELECT * FROM supplier_document WHERE supplier_id = ?')
    .all(supplierId);
  const docBySlot = new Map(documents.map((row) => [row.slot, row]));

  if (profile.banking) {
    const lines = db
      .prepare('SELECT * FROM supplier_bank_account WHERE supplier_id = ? ORDER BY order_index')
      .all(supplierId);
    profile.banking = {
      ...profile.banking,
      lines: lines.map((row) => ({
        ...omitNull({
          id: row.id,
          accountType: row.account_type,
          bankCode: row.bank_code,
          accountNumber: row.account_number,
          accountHolder: row.account_holder,
        }),
        statement: fileOf(docBySlot.get(`banking.lines.${row.id}.statement`)),
      })),
    };
  }

  // Metadata berkas dikembalikan ke posisinya di dalam objek profil.
  for (const row of documents) {
    if (row.slot.startsWith('banking.lines.')) continue;
    placeDocument(profile, row);
  }

  return profile;
}

function omitNull(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

function fileOf(row) {
  if (!row) return null;
  return { name: row.file_name, size: row.file_size, type: row.file_type };
}

function placeDocument(profile, row) {
  const parts = row.slot.split('.');
  let cursor = profile;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  const leaf = parts[parts.length - 1];

  // Dokumen bernomor dan bermasa berlaku (tax.documents.*, licenses.*)
  if (row.number !== null || row.valid_from !== null || row.valid_until !== null) {
    const existing = typeof cursor[leaf] === 'object' && cursor[leaf] ? { ...cursor[leaf] } : {};
    delete existing.__doc;
    cursor[leaf] = {
      ...existing,
      number: row.number ?? existing.number ?? '',
      file: fileOf(row),
      ...(row.valid_from !== null ? { validFrom: row.valid_from } : {}),
      ...(row.valid_until !== null ? { validUntil: row.valid_until } : {}),
    };
    return;
  }
  cursor[leaf] = fileOf(row);
}

/* ------------------------------------------------------------------ */
/* Menulis                                                            */
/* ------------------------------------------------------------------ */

/**
 * Menyimpan satu pengajuan utuh. Front-end mengirim objek lengkap setelah
 * tiap aksi, jadi penyimpanannya idempoten: baris anak dihapus lalu ditulis
 * ulang di dalam satu transaksi. Untuk volume satu pemasok per simpan, ini
 * jauh lebih sederhana daripada menghitung selisih, dan tidak bisa
 * meninggalkan baris yatim.
 */
export function save(submission) {
  const db = getDb();
  const run = db.transaction((input) => {
    writeCore(db, input);
    writeGeneral(db, input);
    writeAddress(db, input);
    writePic(db, input);
    writeAccount(db, input);
    writeInternalDraft(db, input);
    writeConsent(db, input);
    writeVerification(db, input);
    writePreferred(db, input);
    writeTimeline(db, input);
    writeProfile(db, input);
  });

  run(submission);
  return findById(submission.id);
}

function writeCore(db, s) {
  const existing = db.prepare('SELECT created_at FROM supplier WHERE id = ?').get(s.id);
  db.prepare(
    `INSERT INTO supplier
       (id, status, submitted_at, decided_at, reject_reason, onboarding_path, document_source,
        registered_at, edit_rights_transferred_at, preferred_submitted_at, preferred_submitted_by,
        created_at, updated_at)
     VALUES (@id, @status, @submittedAt, @decidedAt, @rejectReason, @onboardingPath, @documentSource,
             @registeredAt, @editRightsTransferredAt, @preferredSubmittedAt, @preferredSubmittedBy,
             @createdAt, @updatedAt)
     ON CONFLICT (id) DO UPDATE SET
       status = excluded.status,
       submitted_at = excluded.submitted_at,
       decided_at = excluded.decided_at,
       reject_reason = excluded.reject_reason,
       onboarding_path = excluded.onboarding_path,
       document_source = excluded.document_source,
       registered_at = excluded.registered_at,
       edit_rights_transferred_at = excluded.edit_rights_transferred_at,
       preferred_submitted_at = excluded.preferred_submitted_at,
       preferred_submitted_by = excluded.preferred_submitted_by,
       updated_at = excluded.updated_at`,
  ).run({
    id: s.id,
    status: s.status,
    submittedAt: s.submittedAt ?? null,
    decidedAt: s.decidedAt ?? null,
    rejectReason: s.rejectReason ?? null,
    onboardingPath: s.onboardingPath ?? null,
    documentSource: s.documentSource ?? null,
    registeredAt: s.registeredAt ?? null,
    editRightsTransferredAt: s.editRightsTransferredAt ?? null,
    preferredSubmittedAt: s.preferredSubmittedAt ?? null,
    preferredSubmittedBy: s.preferredSubmittedBy ?? null,
    createdAt: existing?.created_at ?? s.submittedAt ?? now(),
    updatedAt: now(),
  });
}

function writeGeneral(db, s) {
  const g = s.general;
  if (!g) return;
  const {
    legalStatus,
    entityType,
    vendorName,
    vendorType,
    vendorTypeDetail,
    targetCompanies,
    otvStatus,
    vendorDirectType,
    companyEmail,
    officePhone,
    mobilePhone,
    website,
    ...extra
  } = g;

  db.prepare(
    `INSERT INTO supplier_general
       (supplier_id, legal_status, entity_type, vendor_name, vendor_type, vendor_type_detail,
        otv_status, vendor_direct_type, company_email, office_phone, mobile_phone, website, extra_json)
     VALUES (@id, @legalStatus, @entityType, @vendorName, @vendorType, @vendorTypeDetail,
             @otvStatus, @vendorDirectType, @companyEmail, @officePhone, @mobilePhone, @website, @extra)
     ON CONFLICT (supplier_id) DO UPDATE SET
       legal_status = excluded.legal_status, entity_type = excluded.entity_type,
       vendor_name = excluded.vendor_name, vendor_type = excluded.vendor_type,
       vendor_type_detail = excluded.vendor_type_detail, otv_status = excluded.otv_status,
       vendor_direct_type = excluded.vendor_direct_type, company_email = excluded.company_email,
       office_phone = excluded.office_phone, mobile_phone = excluded.mobile_phone,
       website = excluded.website, extra_json = excluded.extra_json`,
  ).run({
    id: s.id,
    legalStatus: legalStatus ?? null,
    entityType: entityType ?? null,
    vendorName: vendorName ?? null,
    vendorType: vendorType ?? null,
    vendorTypeDetail: vendorTypeDetail ?? null,
    otvStatus: otvStatus ?? null,
    vendorDirectType: vendorDirectType ?? null,
    companyEmail: companyEmail ?? null,
    officePhone: officePhone ?? null,
    mobilePhone: mobilePhone ?? null,
    website: website ?? null,
    extra: toJson(extra) ?? '{}',
  });

  db.prepare('DELETE FROM supplier_target_company WHERE supplier_id = ?').run(s.id);
  db.prepare('DELETE FROM supplier_corporate_code WHERE supplier_id = ?').run(s.id);

  const insertTarget = db.prepare(
    'INSERT INTO supplier_target_company (supplier_id, ui_name, order_index) VALUES (?, ?, ?)',
  );
  const insertCode = db.prepare(
    'INSERT INTO supplier_corporate_code (supplier_id, code) VALUES (?, ?) ON CONFLICT DO NOTHING',
  );

  (targetCompanies ?? []).forEach((name, index) => {
    insertTarget.run(s.id, name, index);
    for (const code of corporateCodesFor([name])) insertCode.run(s.id, code);
  });
}

function writeAddress(db, s) {
  if (!s.address) return;
  const { street, country, province, city, district, subdistrict, postalCode, ...extra } = s.address;
  db.prepare(
    `INSERT INTO supplier_address
       (supplier_id, street, country, province, city, district, subdistrict, postal_code, extra_json)
     VALUES (@id, @street, @country, @province, @city, @district, @subdistrict, @postalCode, @extra)
     ON CONFLICT (supplier_id) DO UPDATE SET
       street = excluded.street, country = excluded.country, province = excluded.province,
       city = excluded.city, district = excluded.district, subdistrict = excluded.subdistrict,
       postal_code = excluded.postal_code, extra_json = excluded.extra_json`,
  ).run({
    id: s.id,
    street: street ?? null,
    country: country ?? null,
    province: province ?? null,
    city: city ?? null,
    district: district ?? null,
    subdistrict: subdistrict ?? null,
    postalCode: postalCode ?? null,
    extra: toJson(extra) ?? '{}',
  });
}

function writePic(db, s) {
  if (!s.contact) return;
  const { name, email, phone, position, ...extra } = s.contact;
  db.prepare(
    `INSERT INTO supplier_pic (supplier_id, name, email, phone, position, extra_json)
     VALUES (@id, @name, @email, @phone, @position, @extra)
     ON CONFLICT (supplier_id) DO UPDATE SET
       name = excluded.name, email = excluded.email, phone = excluded.phone,
       position = excluded.position, extra_json = excluded.extra_json`,
  ).run({
    id: s.id,
    name: name ?? null,
    email: email ?? null,
    phone: phone ?? null,
    position: position ?? null,
    extra: toJson(extra) ?? '{}',
  });
}

function writeAccount(db, s) {
  if (!s.account) {
    db.prepare('DELETE FROM supplier_account WHERE supplier_id = ?').run(s.id);
    return;
  }
  const existing = db
    .prepare('SELECT created_at, password_hash FROM supplier_account WHERE supplier_id = ?')
    .get(s.id);

  db.prepare(
    `INSERT INTO supplier_account
       (supplier_id, account_id, password_hash, temporary_password, invite_token, email_sent_at,
        password_changed, created_at)
     VALUES (@id, @accountId, @passwordHash, @temporaryPassword, @inviteToken, @emailSentAt,
             @passwordChanged, @createdAt)
     ON CONFLICT (supplier_id) DO UPDATE SET
       account_id = excluded.account_id,
       temporary_password = excluded.temporary_password,
       invite_token = excluded.invite_token,
       email_sent_at = excluded.email_sent_at,
       password_changed = excluded.password_changed`,
  ).run({
    id: s.id,
    accountId: s.account.accountId,
    passwordHash: existing?.password_hash ?? null,
    temporaryPassword: s.account.temporaryPassword ?? null,
    inviteToken: s.account.inviteToken ?? null,
    emailSentAt: s.account.emailSentAt ?? null,
    passwordChanged: toInt(s.account.passwordChanged),
    createdAt: existing?.created_at ?? now(),
  });
}

function writeInternalDraft(db, s) {
  if (!s.internalDraft) return;
  db.prepare(
    `INSERT INTO supplier_internal_draft (supplier_id, started_at, filled_by, completed_at)
     VALUES (@id, @startedAt, @filledBy, @completedAt)
     ON CONFLICT (supplier_id) DO UPDATE SET
       started_at = excluded.started_at, filled_by = excluded.filled_by,
       completed_at = excluded.completed_at`,
  ).run({
    id: s.id,
    startedAt: s.internalDraft.startedAt ?? null,
    filledBy: s.internalDraft.filledBy ?? null,
    completedAt: s.internalDraft.completedAt ?? null,
  });
}

function writeConsent(db, s) {
  if (!s.consent) {
    db.prepare('DELETE FROM supplier_consent WHERE supplier_id = ?').run(s.id);
    return;
  }
  db.prepare(
    `INSERT INTO supplier_consent
       (supplier_id, gtc_accepted_at, data_accuracy_accepted_at, accepted_by, version, path)
     VALUES (@id, @gtc, @accuracy, @by, @version, @path)
     ON CONFLICT (supplier_id) DO UPDATE SET
       gtc_accepted_at = excluded.gtc_accepted_at,
       data_accuracy_accepted_at = excluded.data_accuracy_accepted_at,
       accepted_by = excluded.accepted_by, version = excluded.version, path = excluded.path`,
  ).run({
    id: s.id,
    gtc: s.consent.gtcAcceptedAt ?? null,
    accuracy: s.consent.dataAccuracyAcceptedAt ?? null,
    by: s.consent.acceptedBy ?? null,
    version: s.consent.version ?? null,
    path: s.consent.path ?? null,
  });
}

function writeVerification(db, s) {
  if (!s.verification) {
    db.prepare('DELETE FROM supplier_verification WHERE supplier_id = ?').run(s.id);
    db.prepare('DELETE FROM supplier_verification_note WHERE supplier_id = ?').run(s.id);
    return;
  }
  db.prepare(
    `INSERT INTO supplier_verification
       (supplier_id, status, verified_at, verified_by, requested_at, requested_by, triggered_by_section)
     VALUES (@id, @status, @verifiedAt, @verifiedBy, @requestedAt, @requestedBy, @section)
     ON CONFLICT (supplier_id) DO UPDATE SET
       status = excluded.status, verified_at = excluded.verified_at,
       verified_by = excluded.verified_by, requested_at = excluded.requested_at,
       requested_by = excluded.requested_by, triggered_by_section = excluded.triggered_by_section`,
  ).run({
    id: s.id,
    status: s.verification.status ?? null,
    verifiedAt: s.verification.verifiedAt ?? null,
    verifiedBy: s.verification.verifiedBy ?? null,
    requestedAt: s.verification.requestedAt ?? null,
    requestedBy: s.verification.requestedBy ?? null,
    section: s.verification.triggeredBySection ?? null,
  });

  db.prepare('DELETE FROM supplier_verification_note WHERE supplier_id = ?').run(s.id);
  const insert = db.prepare(
    'INSERT INTO supplier_verification_note (supplier_id, note, order_index) VALUES (?, ?, ?)',
  );
  (s.verification.notes ?? []).forEach((note, index) => insert.run(s.id, String(note), index));
}

function writePreferred(db, s) {
  if (!s.preferredDecision) {
    db.prepare('DELETE FROM supplier_preferred_decision WHERE supplier_id = ?').run(s.id);
    return;
  }
  db.prepare(
    `INSERT INTO supplier_preferred_decision (supplier_id, decision, note, decided_at, decided_by)
     VALUES (@id, @decision, @note, @at, @by)
     ON CONFLICT (supplier_id) DO UPDATE SET
       decision = excluded.decision, note = excluded.note,
       decided_at = excluded.decided_at, decided_by = excluded.decided_by`,
  ).run({
    id: s.id,
    decision: s.preferredDecision.decision,
    note: s.preferredDecision.note ?? null,
    at: s.preferredDecision.decidedAt ?? null,
    by: s.preferredDecision.decidedBy ?? null,
  });
}

function writeTimeline(db, s) {
  db.prepare('DELETE FROM supplier_timeline WHERE supplier_id = ?').run(s.id);
  const insert = db.prepare(
    'INSERT INTO supplier_timeline (supplier_id, at, label, actor, order_index) VALUES (?, ?, ?, ?, ?)',
  );
  (s.timeline ?? []).forEach((entry, index) =>
    insert.run(s.id, entry.at, entry.label, entry.actor ?? null, index),
  );
}

function writeProfile(db, s) {
  const profile = s.profile;
  if (!profile) return;

  db.prepare('DELETE FROM supplier_document WHERE supplier_id = ?').run(s.id);
  db.prepare('DELETE FROM supplier_bank_account WHERE supplier_id = ?').run(s.id);
  db.prepare('DELETE FROM supplier_contact_person WHERE supplier_id = ?').run(s.id);

  const insertDoc = db.prepare(
    `INSERT INTO supplier_document
       (id, supplier_id, section_id, slot, file_name, file_size, file_type, number,
        valid_from, valid_until, uploaded_at)
     VALUES (@id, @supplierId, @sectionId, @slot, @fileName, @fileSize, @fileType, @number,
             @validFrom, @validUntil, @uploadedAt)
     ON CONFLICT (supplier_id, slot) DO UPDATE SET
       file_name = excluded.file_name, file_size = excluded.file_size,
       file_type = excluded.file_type, number = excluded.number,
       valid_from = excluded.valid_from, valid_until = excluded.valid_until`,
  );

  const upsertSection = db.prepare(
    `INSERT INTO supplier_profile_section
       (supplier_id, section_id, completed, filled_by, data_json, updated_at)
     VALUES (@supplierId, @sectionId, @completed, @filledBy, @data, @updatedAt)
     ON CONFLICT (supplier_id, section_id) DO UPDATE SET
       completed = excluded.completed, filled_by = excluded.filled_by,
       data_json = excluded.data_json, updated_at = excluded.updated_at`,
  );

  for (const sectionId of PROFILE_SECTIONS) {
    const raw = profile[sectionId];
    if (raw === undefined) continue;

    let stored = raw;

    if (sectionId === 'contacts') {
      writeContacts(db, s.id, Array.isArray(raw) ? raw : []);
      stored = {};
    } else if (sectionId === 'banking') {
      const { lines = [], ...header } = raw ?? {};
      writeBankLines(db, s.id, lines, insertDoc);
      stored = header;
    } else {
      stored = extractDocuments(raw, sectionId, sectionId, (doc) =>
        insertDoc.run({ ...doc, supplierId: s.id, sectionId }),
      );
    }

    upsertSection.run({
      supplierId: s.id,
      sectionId,
      completed: toInt(profile.completed?.[sectionId]),
      filledBy: profile.filledBy?.[sectionId] ?? null,
      data: toJson(stored) ?? '{}',
      updatedAt: now(),
    });
  }
}

function writeContacts(db, supplierId, contacts) {
  const insert = db.prepare(
    `INSERT INTO supplier_contact_person
       (id, supplier_id, name, title, job_position, email, phone, mobile, notes, is_primary, order_index)
     VALUES (@id, @supplierId, @name, @title, @jobPosition, @email, @phone, @mobile, @notes, @isPrimary, @order)`,
  );
  contacts.forEach((contact, index) =>
    insert.run({
      id: contact.id ?? makeId('ct'),
      supplierId,
      name: contact.name ?? null,
      title: contact.title ?? null,
      jobPosition: contact.jobPosition ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      mobile: contact.mobile ?? null,
      notes: contact.notes ?? null,
      isPrimary: toInt(contact.isPrimary),
      order: index,
    }),
  );
}

function writeBankLines(db, supplierId, lines, insertDoc) {
  const insert = db.prepare(
    `INSERT INTO supplier_bank_account
       (id, supplier_id, account_type, bank_code, account_number, account_holder, order_index)
     VALUES (@id, @supplierId, @accountType, @bankCode, @accountNumber, @accountHolder, @order)
     ON CONFLICT (supplier_id, bank_code, account_number) DO NOTHING`,
  );

  lines.forEach((line, index) => {
    const id = line.id ?? makeId('bank');
    insert.run({
      id,
      supplierId,
      accountType: line.accountType ?? null,
      bankCode: line.bankCode ?? null,
      accountNumber: line.accountNumber ?? null,
      accountHolder: line.accountHolder ?? null,
      order: index,
    });
    if (line.statement?.name) {
      insertDoc.run({
        id: makeId('doc'),
        supplierId,
        sectionId: 'banking',
        slot: `banking.lines.${id}.statement`,
        fileName: line.statement.name,
        fileSize: line.statement.size ?? null,
        fileType: line.statement.type ?? null,
        number: null,
        validFrom: null,
        validUntil: null,
        uploadedAt: now(),
      });
    }
  });
}

/**
 * Menelusuri objek sebuah bagian profil, mengeluarkan setiap metadata berkas
 * ke `supplier_document`, dan mengembalikan sisanya untuk disimpan sebagai
 * JSON. Berkas dikenali dari bentuknya: objek yang punya `name` dan `size`.
 */
function extractDocuments(value, sectionId, slotPrefix, emit) {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      extractDocuments(item, sectionId, `${slotPrefix}.${index}`, emit),
    );
  }

  if (isFileMeta(value)) {
    emit({
      id: makeId('doc'),
      slot: slotPrefix,
      fileName: value.name,
      fileSize: value.size ?? null,
      fileType: value.type ?? null,
      number: null,
      validFrom: null,
      validUntil: null,
      uploadedAt: now(),
    });
    return { __doc: slotPrefix };
  }

  // Dokumen bernomor: { number, file, validFrom, validUntil } atau { number, file, expiryDate }
  if ('file' in value && ('number' in value || 'validFrom' in value || 'expiryDate' in value)) {
    const { file, number, validFrom, validUntil, ...rest } = value;
    if (isFileMeta(file)) {
      emit({
        id: makeId('doc'),
        slot: slotPrefix,
        fileName: file.name,
        fileSize: file.size ?? null,
        fileType: file.type ?? null,
        number: number ?? null,
        // `expiryDate` (Lisensi & Sertifikat) sengaja dibiarkan di JSON:
        // memindahkannya ke valid_until akan mengubah bentuk yang dibaca ulang.
        validFrom: validFrom ?? null,
        validUntil: validUntil ?? null,
        uploadedAt: now(),
      });
      return { ...rest, __doc: slotPrefix };
    }
    return value;
  }

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = extractDocuments(child, sectionId, `${slotPrefix}.${key}`, emit);
  }
  return out;
}

function isFileMeta(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    ('size' in value || 'type' in value)
  );
}

export function remove(id) {
  return getDb().prepare('DELETE FROM supplier WHERE id = ?').run(id).changes > 0;
}

export function findByAccountId(accountId) {
  const row = getDb()
    .prepare('SELECT supplier_id FROM supplier_account WHERE lower(account_id) = lower(?)')
    .get(accountId);
  return row ? findById(row.supplier_id) : null;
}

export function nextSupplierId() {
  const row = getDb().prepare('SELECT COUNT(*) AS total FROM supplier').get();
  return `SUP-2026-${String(150 + row.total).padStart(4, '0')}`;
}
