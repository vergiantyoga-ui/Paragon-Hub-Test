import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';
import { parseJson, toBool, toInt, toJson } from '../lib/json.js';

/**
 * Template, versi, seksi, pertanyaan, dan pustaka.
 *
 * Versi dibaca sebagai satu pohon (`version.sections[].questions[]`) karena
 * itulah bentuk yang dipakai mesin dan builder. Penyimpanannya tetap
 * dinormalisasi supaya pertanyaan dapat dicari lintas versi — mencari soal
 * yang memakai tipe tertentu, misalnya, tidak perlu memindai JSON.
 */

/* ----------------------------- Template ----------------------------- */

export function listTemplates() {
  return getDb()
    .prepare('SELECT * FROM questionnaire_template ORDER BY updated_at DESC')
    .all()
    .map(templateToDomain);
}

export function findTemplate(id) {
  const row = getDb().prepare('SELECT * FROM questionnaire_template WHERE id = ?').get(id);
  return row ? templateToDomain(row) : null;
}

function templateToDomain(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type ?? '',
    description: row.description ?? '',
    targetSupplierType: row.target_supplier_type ?? '',
    materialType: row.material_type ?? '',
    ownerId: row.owner_id ?? '',
    ownerName: row.owner_name ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveTemplate(template) {
  const db = getDb();
  const existing = db
    .prepare('SELECT created_at FROM questionnaire_template WHERE id = ?')
    .get(template.id);

  db.prepare(
    `INSERT INTO questionnaire_template
       (id, code, name, type, description, target_supplier_type, material_type,
        owner_id, owner_name, created_at, updated_at)
     VALUES (@id, @code, @name, @type, @description, @targetSupplierType, @materialType,
             @ownerId, @ownerName, @createdAt, @updatedAt)
     ON CONFLICT (id) DO UPDATE SET
       code = excluded.code, name = excluded.name, type = excluded.type,
       description = excluded.description, target_supplier_type = excluded.target_supplier_type,
       material_type = excluded.material_type, owner_id = excluded.owner_id,
       owner_name = excluded.owner_name, updated_at = excluded.updated_at`,
  ).run({
    id: template.id,
    code: template.code ?? '',
    name: template.name ?? '',
    type: template.type ?? null,
    description: template.description ?? null,
    targetSupplierType: template.targetSupplierType ?? null,
    materialType: template.materialType ?? null,
    ownerId: template.ownerId ?? null,
    ownerName: template.ownerName ?? null,
    createdAt: existing?.created_at ?? template.createdAt ?? now(),
    updatedAt: template.updatedAt ?? now(),
  });

  return findTemplate(template.id);
}

export function deleteTemplate(id) {
  return getDb().prepare('DELETE FROM questionnaire_template WHERE id = ?').run(id).changes > 0;
}

/* ------------------------------ Versi ------------------------------- */

export function listVersions({ templateId } = {}) {
  const db = getDb();
  const rows = templateId
    ? db
        .prepare('SELECT id FROM questionnaire_version WHERE template_id = ? ORDER BY created_at DESC')
        .all(templateId)
    : db.prepare('SELECT id FROM questionnaire_version ORDER BY created_at DESC').all();
  return rows.map((row) => findVersion(row.id));
}

export function findVersion(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM questionnaire_version WHERE id = ?').get(id);
  if (!row) return null;

  const riskBands = db
    .prepare('SELECT * FROM questionnaire_risk_band WHERE version_id = ? ORDER BY order_index')
    .all(id)
    .map((band) => ({
      id: band.id,
      label: band.label,
      min: band.min_score,
      max: band.max_score,
      risk: band.risk,
    }));

  const sections = db
    .prepare('SELECT * FROM questionnaire_section WHERE version_id = ? ORDER BY order_index')
    .all(id)
    .map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? '',
      order: section.order_index,
      mandatory: toBool(section.mandatory),
      weight: section.weight,
      questions: questionsOf(section.id),
    }));

  return {
    id: row.id,
    templateId: row.template_id,
    versionLabel: row.version_label,
    status: row.status,
    effectiveDate: row.effective_date,
    expiryDate: row.expiry_date,
    estimatedMinutes: row.estimated_minutes,
    scoringEnabled: toBool(row.scoring_enabled),
    passingScore: row.passing_score,
    riskBands,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    sections,
  };
}

function questionsOf(sectionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM question WHERE section_id = ? ORDER BY order_index')
    .all(sectionId)
    .map((row) => {
      const options = db
        .prepare('SELECT * FROM question_option WHERE question_id = ? ORDER BY order_index')
        .all(row.id)
        .map((option) => ({
          id: option.id,
          label: option.label ?? '',
          value: option.value ?? '',
          score: option.score,
          excludeFromScoring: toBool(option.exclude_from_scoring),
        }));

      const rule = db.prepare('SELECT * FROM attachment_rule WHERE question_id = ?').get(row.id);

      return {
        id: row.id,
        code: row.code ?? '',
        text: row.text,
        guidance: row.guidance ?? '',
        type: row.type,
        required: toBool(row.required),
        defaultValue: parseJson(row.default_value, null),
        placeholder: row.placeholder ?? '',
        helpText: row.help_text ?? '',
        weight: row.weight,
        order: row.order_index,
        options,
        conditions: parseJson(row.conditions_json, null),
        validation: parseJson(row.validation_json, {}) ?? {},
        attachmentRule: rule
          ? {
              required: toBool(rule.required),
              maxFiles: rule.max_files,
              maxFileSizeMb: rule.max_file_size_mb,
              allowedTypes: parseJson(rule.allowed_types_json, []) ?? [],
              expiryDateRequired: toBool(rule.expiry_date_required),
              expiryMinDays: rule.expiry_min_days,
            }
          : null,
        libraryItemId: row.library_item_id,
      };
    });
}

/**
 * Menyimpan satu versi beserta seluruh isinya. Seksi dan pertanyaan ditulis
 * ulang seluruhnya: builder mengirim pohon utuh setelah tiap suntingan, dan
 * menulis ulang satu versi jauh lebih murah daripada menghitung selisih
 * pohon — sekaligus menutup kemungkinan pertanyaan yatim.
 */
export function saveVersion(version) {
  const db = getDb();
  const existing = db
    .prepare('SELECT created_at FROM questionnaire_version WHERE id = ?')
    .get(version.id);

  const run = db.transaction((v) => {
    db.prepare(
      `INSERT INTO questionnaire_version
         (id, template_id, version_label, status, effective_date, expiry_date, estimated_minutes,
          scoring_enabled, passing_score, published_at, published_by, created_at, updated_at)
       VALUES (@id, @templateId, @versionLabel, @status, @effectiveDate, @expiryDate, @estimatedMinutes,
               @scoringEnabled, @passingScore, @publishedAt, @publishedBy, @createdAt, @updatedAt)
       ON CONFLICT (id) DO UPDATE SET
         version_label = excluded.version_label, status = excluded.status,
         effective_date = excluded.effective_date, expiry_date = excluded.expiry_date,
         estimated_minutes = excluded.estimated_minutes, scoring_enabled = excluded.scoring_enabled,
         passing_score = excluded.passing_score, published_at = excluded.published_at,
         published_by = excluded.published_by, updated_at = excluded.updated_at`,
    ).run({
      id: v.id,
      templateId: v.templateId,
      versionLabel: v.versionLabel,
      status: v.status,
      effectiveDate: v.effectiveDate ?? null,
      expiryDate: v.expiryDate ?? null,
      estimatedMinutes: v.estimatedMinutes ?? null,
      scoringEnabled: toInt(v.scoringEnabled),
      passingScore: v.passingScore ?? null,
      publishedAt: v.publishedAt ?? null,
      publishedBy: v.publishedBy ?? null,
      createdAt: existing?.created_at ?? now(),
      updatedAt: now(),
    });

    db.prepare('DELETE FROM questionnaire_risk_band WHERE version_id = ?').run(v.id);
    const insertBand = db.prepare(
      `INSERT INTO questionnaire_risk_band (id, version_id, label, min_score, max_score, risk, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    (v.riskBands ?? []).forEach((band, index) =>
      insertBand.run(band.id, v.id, band.label, band.min, band.max, band.risk, index),
    );

    // Menghapus seksi ikut menghapus pertanyaan, pilihan, dan aturan lampiran
    // lewat ON DELETE CASCADE.
    db.prepare('DELETE FROM questionnaire_section WHERE version_id = ?').run(v.id);

    const insertSection = db.prepare(
      `INSERT INTO questionnaire_section (id, version_id, name, description, order_index, mandatory, weight)
       VALUES (@id, @versionId, @name, @description, @order, @mandatory, @weight)`,
    );
    const insertQuestion = db.prepare(
      `INSERT INTO question
         (id, section_id, code, text, guidance, type, required, default_value, placeholder,
          help_text, weight, order_index, conditions_json, validation_json, library_item_id)
       VALUES (@id, @sectionId, @code, @text, @guidance, @type, @required, @defaultValue, @placeholder,
               @helpText, @weight, @order, @conditions, @validation, @libraryItemId)`,
    );
    const insertOption = db.prepare(
      `INSERT INTO question_option (id, question_id, label, value, score, exclude_from_scoring, order_index)
       VALUES (@id, @questionId, @label, @value, @score, @exclude, @order)`,
    );
    const insertRule = db.prepare(
      `INSERT INTO attachment_rule
         (question_id, required, max_files, max_file_size_mb, allowed_types_json,
          expiry_date_required, expiry_min_days)
       VALUES (@questionId, @required, @maxFiles, @maxSize, @allowedTypes, @expiryRequired, @expiryMinDays)`,
    );

    (v.sections ?? []).forEach((section, sectionIndex) => {
      insertSection.run({
        id: section.id,
        versionId: v.id,
        name: section.name ?? '',
        description: section.description ?? null,
        order: section.order ?? sectionIndex,
        mandatory: toInt(section.mandatory),
        weight: section.weight ?? 1,
      });

      (section.questions ?? []).forEach((question, questionIndex) => {
        insertQuestion.run({
          id: question.id,
          sectionId: section.id,
          code: question.code ?? null,
          text: question.text ?? '',
          guidance: question.guidance ?? null,
          type: question.type,
          required: toInt(question.required),
          defaultValue: toJson(question.defaultValue),
          placeholder: question.placeholder ?? null,
          helpText: question.helpText ?? null,
          weight: question.weight ?? 1,
          order: question.order ?? questionIndex,
          conditions: question.conditions ? toJson(question.conditions) : null,
          validation: toJson(question.validation ?? {}) ?? '{}',
          libraryItemId: question.libraryItemId ?? null,
        });

        (question.options ?? []).forEach((option, optionIndex) =>
          insertOption.run({
            id: option.id,
            questionId: question.id,
            label: option.label ?? '',
            value: option.value ?? '',
            score: option.score ?? 0,
            exclude: toInt(option.excludeFromScoring),
            order: optionIndex,
          }),
        );

        if (question.attachmentRule) {
          insertRule.run({
            questionId: question.id,
            required: toInt(question.attachmentRule.required),
            maxFiles: question.attachmentRule.maxFiles ?? 1,
            maxSize: question.attachmentRule.maxFileSizeMb ?? 2,
            allowedTypes: toJson(question.attachmentRule.allowedTypes ?? []) ?? '[]',
            expiryRequired: toInt(question.attachmentRule.expiryDateRequired),
            expiryMinDays: question.attachmentRule.expiryMinDays ?? null,
          });
        }
      });
    });
  });

  run(version);
  return findVersion(version.id);
}

/* ----------------------------- Pustaka ------------------------------ */

export function listQuestionLibrary() {
  return getDb()
    .prepare('SELECT * FROM question_library_item ORDER BY created_at DESC')
    .all()
    .map((row) => parseJson(row.payload_json, {}));
}

export function listSectionLibrary() {
  return getDb()
    .prepare('SELECT * FROM section_library_item ORDER BY created_at DESC')
    .all()
    .map((row) => parseJson(row.payload_json, {}));
}

export function saveQuestionLibraryItem(item) {
  const id = item.id ?? makeId('qlib');
  getDb()
    .prepare(
      `INSERT INTO question_library_item (id, category, label, payload_json, created_at)
       VALUES (@id, @category, @label, @payload, @createdAt)
       ON CONFLICT (id) DO UPDATE SET
         category = excluded.category, label = excluded.label, payload_json = excluded.payload_json`,
    )
    .run({
      id,
      category: item.category ?? null,
      label: item.label ?? item.text ?? item.name ?? null,
      payload: toJson({ ...item, id }),
      createdAt: now(),
    });
  return { ...item, id };
}

export function saveSectionLibraryItem(item) {
  const id = item.id ?? makeId('slib');
  getDb()
    .prepare(
      `INSERT INTO section_library_item (id, name, payload_json, created_at)
       VALUES (@id, @name, @payload, @createdAt)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, payload_json = excluded.payload_json`,
    )
    .run({
      id,
      name: item.name ?? null,
      payload: toJson({ ...item, id }),
      createdAt: now(),
    });
  return { ...item, id };
}
