import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';
import { parseJson, toBool, toInt, toJson } from '../lib/json.js';

/**
 * Penugasan, respons pemasok, dan tinjauan.
 *
 * Jawaban disimpan satu baris per pertanyaan, bukan satu blob per respons.
 * Bedanya terasa saat menjawab pertanyaan seperti "berapa pemasok yang
 * menjawab 'tidak' pada pertanyaan kepatuhan hewan" — dengan blob, itu berarti
 * memindai seluruh respons di aplikasi.
 */

/* ---------------------------- Penugasan ----------------------------- */

export function listAssignments({ supplierId, reviewerId } = {}) {
  const db = getDb();
  const where = [];
  const params = {};
  if (supplierId) {
    where.push('supplier_id = @supplierId');
    params.supplierId = supplierId;
  }
  if (reviewerId) {
    where.push('reviewer_id = @reviewerId');
    params.reviewerId = reviewerId;
  }

  return db
    .prepare(
      `SELECT * FROM questionnaire_assignment
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY assigned_at DESC`,
    )
    .all(params)
    .map(assignmentToDomain);
}

export function findAssignment(id) {
  const row = getDb().prepare('SELECT * FROM questionnaire_assignment WHERE id = ?').get(id);
  return row ? assignmentToDomain(row) : null;
}

function assignmentToDomain(row) {
  return {
    id: row.id,
    versionId: row.version_id,
    templateId: row.template_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name ?? '',
    supplierSite: row.supplier_site ?? '',
    materialCategory: row.material_category ?? '',
    materialName: row.material_name ?? '',
    dueDate: row.due_date,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name ?? '',
    priority: row.priority,
    instructions: row.instructions ?? '',
    assignedBy: row.assigned_by ?? '',
    assignedAt: row.assigned_at,
  };
}

export function saveAssignment(assignment) {
  getDb()
    .prepare(
      `INSERT INTO questionnaire_assignment
         (id, version_id, template_id, supplier_id, supplier_name, supplier_site, material_category,
          material_name, due_date, reviewer_id, reviewer_name, priority, instructions, assigned_by, assigned_at)
       VALUES (@id, @versionId, @templateId, @supplierId, @supplierName, @supplierSite, @materialCategory,
               @materialName, @dueDate, @reviewerId, @reviewerName, @priority, @instructions, @assignedBy, @assignedAt)
       ON CONFLICT (id) DO UPDATE SET
         version_id = excluded.version_id, template_id = excluded.template_id,
         supplier_id = excluded.supplier_id, supplier_name = excluded.supplier_name,
         supplier_site = excluded.supplier_site, material_category = excluded.material_category,
         material_name = excluded.material_name, due_date = excluded.due_date,
         reviewer_id = excluded.reviewer_id, reviewer_name = excluded.reviewer_name,
         priority = excluded.priority, instructions = excluded.instructions`,
    )
    .run({
      id: assignment.id,
      versionId: assignment.versionId,
      templateId: assignment.templateId ?? null,
      supplierId: assignment.supplierId,
      supplierName: assignment.supplierName ?? null,
      supplierSite: assignment.supplierSite ?? null,
      materialCategory: assignment.materialCategory ?? null,
      materialName: assignment.materialName ?? null,
      dueDate: assignment.dueDate ?? null,
      reviewerId: assignment.reviewerId ?? null,
      reviewerName: assignment.reviewerName ?? null,
      priority: assignment.priority ?? 'normal',
      instructions: assignment.instructions ?? null,
      assignedBy: assignment.assignedBy ?? null,
      assignedAt: assignment.assignedAt ?? now(),
    });

  return findAssignment(assignment.id);
}

/* ----------------------------- Respons ------------------------------ */

export function listResponses({ status, supplierId } = {}) {
  const db = getDb();
  let sql = 'SELECT r.id FROM questionnaire_response r';
  const where = [];
  const params = {};

  if (supplierId) {
    sql += ' JOIN questionnaire_assignment a ON a.id = r.assignment_id';
    where.push('a.supplier_id = @supplierId');
    params.supplierId = supplierId;
  }
  if (status) {
    where.push('r.status = @status');
    params.status = status;
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY r.updated_at DESC';

  return db.prepare(sql).all(params).map((row) => findResponse(row.id));
}

export function findResponse(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM questionnaire_response WHERE id = ?').get(id);
  if (!row) return null;

  const answerRows = db.prepare('SELECT * FROM questionnaire_answer WHERE response_id = ?').all(id);
  const answers = {};
  const attachments = {};

  for (const answer of answerRows) {
    if (!toBool(answer.skipped)) answers[answer.question_id] = parseJson(answer.value_json, null);

    const files = db
      .prepare('SELECT * FROM answer_attachment WHERE answer_id = ? ORDER BY order_index')
      .all(answer.id);
    if (files.length) {
      attachments[answer.question_id] = files.map((file) => ({
        id: file.id,
        fileName: file.file_name,
        fileType: file.file_type,
        fileSize: file.file_size,
        expiryDate: file.expiry_date,
        uploadedAt: file.uploaded_at,
      }));
    }
  }

  const reviews = db
    .prepare('SELECT * FROM questionnaire_review WHERE response_id = ? ORDER BY order_index')
    .all(id)
    .map((review) => {
      const items = db
        .prepare(
          'SELECT * FROM questionnaire_comment WHERE review_id = ? ORDER BY kind, order_index',
        )
        .all(review.id);

      return {
        id: review.id,
        revision: review.revision,
        decision: review.decision,
        note: review.note ?? '',
        reviewerId: review.reviewer_id,
        reviewerName: review.reviewer_name ?? '',
        decidedAt: review.at,
        flagged: items
          .filter((item) => item.kind === 'flag')
          .map((item) => ({
            questionId: item.question_id,
            reason: item.note ?? '',
            ...(parseJson(item.payload_json, {}) ?? {}),
          })),
        comments: items
          .filter((item) => item.kind === 'comment')
          .map((item) => ({
            questionId: item.question_id,
            note: item.note ?? '',
            ...(parseJson(item.payload_json, {}) ?? {}),
          })),
        answerSnapshot: parseJson(review.answer_snapshot_json, {}) ?? {},
      };
    });

  const history = db
    .prepare('SELECT at, label, actor FROM response_history WHERE response_id = ? ORDER BY order_index')
    .all(id);

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completionPercent: row.completion_percent,
    score: row.score,
    riskLevel: row.risk_level,
    answers,
    attachments,
    revision: row.revision,
    reviews,
    history,
  };
}

export function saveResponse(response) {
  const db = getDb();

  const run = db.transaction((r) => {
    db.prepare(
      `INSERT INTO questionnaire_response
         (id, assignment_id, status, started_at, submitted_at, completion_percent, score,
          risk_level, revision, updated_at)
       VALUES (@id, @assignmentId, @status, @startedAt, @submittedAt, @completionPercent, @score,
               @riskLevel, @revision, @updatedAt)
       ON CONFLICT (id) DO UPDATE SET
         status = excluded.status, started_at = excluded.started_at,
         submitted_at = excluded.submitted_at, completion_percent = excluded.completion_percent,
         score = excluded.score, risk_level = excluded.risk_level,
         revision = excluded.revision, updated_at = excluded.updated_at`,
    ).run({
      id: r.id,
      assignmentId: r.assignmentId,
      status: r.status,
      startedAt: r.startedAt ?? null,
      submittedAt: r.submittedAt ?? null,
      completionPercent: r.completionPercent ?? null,
      score: r.score ?? null,
      riskLevel: r.riskLevel ?? null,
      revision: r.revision ?? 1,
      updatedAt: now(),
    });

    writeAnswers(db, r);
    writeReviews(db, r);
    writeHistory(db, r);
  });

  run(response);
  return findResponse(response.id);
}

function writeAnswers(db, r) {
  db.prepare('DELETE FROM questionnaire_answer WHERE response_id = ?').run(r.id);

  const insertAnswer = db.prepare(
    `INSERT INTO questionnaire_answer (id, response_id, question_id, value_json, skipped, updated_at)
     VALUES (@id, @responseId, @questionId, @value, @skipped, @updatedAt)`,
  );
  const insertFile = db.prepare(
    `INSERT INTO answer_attachment
       (id, answer_id, file_name, file_size, file_type, expiry_date, uploaded_at, order_index)
     VALUES (@id, @answerId, @fileName, @fileSize, @fileType, @expiryDate, @uploadedAt, @order)`,
  );

  const questionIds = new Set([
    ...Object.keys(r.answers ?? {}),
    ...Object.keys(r.attachments ?? {}),
  ]);

  for (const questionId of questionIds) {
    const answerId = makeId('ans');
    const hasValue = Object.prototype.hasOwnProperty.call(r.answers ?? {}, questionId);

    insertAnswer.run({
      id: answerId,
      responseId: r.id,
      questionId,
      value: hasValue ? toJson(r.answers[questionId]) : null,
      skipped: toInt(!hasValue),
      updatedAt: now(),
    });

    (r.attachments?.[questionId] ?? []).forEach((file, index) =>
      insertFile.run({
        id: file.id ?? makeId('att'),
        answerId,
        fileName: file.fileName ?? file.name ?? '',
        fileSize: file.fileSize ?? file.size ?? null,
        fileType: file.fileType ?? file.type ?? null,
        expiryDate: file.expiryDate ?? null,
        uploadedAt: file.uploadedAt ?? now(),
        order: index,
      }),
    );
  }
}

function writeReviews(db, r) {
  db.prepare('DELETE FROM questionnaire_review WHERE response_id = ?').run(r.id);
  db.prepare('DELETE FROM questionnaire_comment WHERE response_id = ?').run(r.id);

  const insertReview = db.prepare(
    `INSERT INTO questionnaire_review
       (id, response_id, decision, reviewer_id, reviewer_name, note, revision,
        answer_snapshot_json, at, order_index)
     VALUES (@id, @responseId, @decision, @reviewerId, @reviewerName, @note, @revision,
             @snapshot, @at, @order)`,
  );
  const insertItem = db.prepare(
    `INSERT INTO questionnaire_comment
       (id, response_id, review_id, kind, question_id, note, revision, resolved, payload_json, order_index, at)
     VALUES (@id, @responseId, @reviewId, @kind, @questionId, @note, @revision, @resolved, @payload, @order, @at)`,
  );

  (r.reviews ?? []).forEach((review, index) => {
    const reviewId = review.id ?? makeId('rev');
    insertReview.run({
      id: reviewId,
      responseId: r.id,
      decision: review.decision,
      reviewerId: review.reviewerId ?? null,
      reviewerName: review.reviewerName ?? null,
      note: review.note ?? null,
      revision: review.revision ?? 1,
      snapshot: toJson(review.answerSnapshot ?? {}) ?? '{}',
      at: review.decidedAt ?? now(),
      order: index,
    });

    (review.flagged ?? []).forEach((item, itemIndex) => {
      const { questionId, reason, ...rest } = item;
      insertItem.run({
        id: makeId('flg'),
        responseId: r.id,
        reviewId,
        kind: 'flag',
        questionId: questionId ?? null,
        note: reason ?? null,
        revision: review.revision ?? 1,
        resolved: 0,
        payload: toJson(rest) ?? '{}',
        order: itemIndex,
        at: review.decidedAt ?? now(),
      });
    });

    (review.comments ?? []).forEach((item, itemIndex) => {
      const { questionId, note, ...rest } = item;
      insertItem.run({
        id: makeId('cmt'),
        responseId: r.id,
        reviewId,
        kind: 'comment',
        questionId: questionId ?? null,
        note: note ?? null,
        revision: review.revision ?? 1,
        resolved: 0,
        payload: toJson(rest) ?? '{}',
        order: itemIndex,
        at: review.decidedAt ?? now(),
      });
    });
  });
}

function writeHistory(db, r) {
  db.prepare('DELETE FROM response_history WHERE response_id = ?').run(r.id);
  const insert = db.prepare(
    'INSERT INTO response_history (response_id, at, label, actor, order_index) VALUES (?, ?, ?, ?, ?)',
  );
  (r.history ?? []).forEach((entry, index) =>
    insert.run(r.id, entry.at, entry.label, entry.actor ?? null, index),
  );
}

/**
 * Menyimpan satu putaran revisi sebagai rekaman utuh. Tabelnya hanya
 * ditambah, tidak pernah diubah — riwayat yang bisa disunting bukan riwayat.
 */
export function recordRevision(responseId, revision, snapshot) {
  getDb()
    .prepare(
      `INSERT INTO response_revision (id, response_id, revision, snapshot_json, at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (response_id, revision) DO NOTHING`,
    )
    .run(makeId('rvs'), responseId, revision, toJson(snapshot) ?? '{}', now());
}

export function listRevisions(responseId) {
  return getDb()
    .prepare('SELECT * FROM response_revision WHERE response_id = ? ORDER BY revision')
    .all(responseId)
    .map((row) => ({
      id: row.id,
      revision: row.revision,
      snapshot: parseJson(row.snapshot_json, {}),
      at: row.at,
    }));
}
