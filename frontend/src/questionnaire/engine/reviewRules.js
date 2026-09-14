import { RESPONSE_STATUS } from './schema.js';
import { visibleQuestionIds } from './conditions.js';

/**
 * Aturan tinjauan dan revisi.
 *
 * Yang paling penting di sini: saat status "perlu revisi", pemasok hanya boleh
 * menyunting pertanyaan yang benar-benar ditandai peninjau. Membiarkan seluruh
 * kuesioner terbuka akan membuat jawaban yang sudah disetujui ikut berubah
 * tanpa sepengetahuan siapa pun.
 */

export const REVIEW_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REVISION: 'request_revision',
};

/** Respons yang menunggu tindakan peninjau. */
export function awaitsReview(response) {
  return (
    response.status === RESPONSE_STATUS.SUBMITTED ||
    response.status === RESPONSE_STATUS.UNDER_REVIEW
  );
}

/** Respons yang sudah selesai dinilai dan tidak berubah lagi. */
export function isSettled(response) {
  return (
    response.status === RESPONSE_STATUS.APPROVED ||
    response.status === RESPONSE_STATUS.REJECTED
  );
}

/**
 * Pertanyaan yang ditandai perlu diperbaiki pada putaran revisi berjalan.
 * @returns {Set<string>}
 */
export function questionsNeedingRevision(response) {
  if (response.status !== RESPONSE_STATUS.REVISION_REQUIRED) return new Set();
  const latest = latestReview(response);
  return new Set((latest?.flagged ?? []).map((item) => item.questionId));
}

/**
 * Apakah sebuah pertanyaan boleh disunting pemasok saat ini.
 * Di luar mode revisi, seluruh pertanyaan terbuka selama belum dikirim.
 */
export function canSupplierEdit(response, questionId) {
  if (response.status === RESPONSE_STATUS.REVISION_REQUIRED) {
    return questionsNeedingRevision(response).has(questionId);
  }
  return (
    response.status === RESPONSE_STATUS.NOT_STARTED ||
    response.status === RESPONSE_STATUS.IN_PROGRESS
  );
}

/** Tinjauan terakhir; riwayat sebelumnya tidak pernah dihapus. */
export function latestReview(response) {
  const reviews = response.reviews ?? [];
  return reviews.length > 0 ? reviews[reviews.length - 1] : null;
}

/** Komentar peninjau untuk satu pertanyaan, dari seluruh putaran. */
export function commentsFor(response, questionId) {
  return (response.reviews ?? [])
    .flatMap((review) =>
      (review.flagged ?? [])
        .filter((item) => item.questionId === questionId)
        .map((item) => ({
          revision: review.revision,
          comment: item.comment,
          reviewer: review.reviewerName,
          at: review.decidedAt,
        })),
    )
    .concat(
      (response.reviews ?? []).flatMap((review) =>
        (review.comments ?? [])
          .filter((item) => item.questionId === questionId)
          .map((item) => ({
            revision: review.revision,
            comment: item.comment,
            reviewer: review.reviewerName,
            at: review.decidedAt,
          })),
      ),
    )
    .sort((a, b) => a.revision - b.revision);
}

/**
 * Apakah revisi sudah layak dikirim ulang: seluruh pertanyaan yang ditandai
 * harus benar-benar berubah dari nilai saat ditinjau. Tanpa pemeriksaan ini
 * pemasok bisa menekan kirim tanpa memperbaiki apa pun.
 */
export function revisionBlockers(response, version) {
  const flagged = latestReview(response)?.flagged ?? [];
  const snapshot = latestReview(response)?.answerSnapshot ?? {};
  const visible = visibleQuestionIds(version, response.answers);

  return flagged
    .filter((item) => visible.has(item.questionId))
    .filter((item) => {
      const before = JSON.stringify(snapshot[item.questionId] ?? null);
      const after = JSON.stringify(response.answers[item.questionId] ?? null);
      const filesBefore = (item.attachmentSnapshot ?? []).length;
      const filesAfter = (response.attachments[item.questionId] ?? []).length;
      return before === after && filesBefore === filesAfter;
    })
    .map((item) => ({
      questionId: item.questionId,
      comment: item.comment,
    }));
}

/** Nomor putaran berikutnya. */
export function nextRevision(response) {
  return (response.revision ?? 1) + 1;
}

/* ------------------------------------------------------------------ */
/* Ringkasan untuk dashboard                                          */
/* ------------------------------------------------------------------ */

/**
 * Menghitung KPI dari seluruh template, versi, penugasan, dan respons.
 * Dipisah dari komponen supaya angkanya bisa diuji tanpa merender apa pun.
 */
export function summarise({ templates, versions, assignments, responses }, now = Date.now()) {
  const byStatus = (status) => responses.filter((item) => item.status === status).length;

  const overdue = assignments.filter((assignment) => {
    const response = responses.find((item) => item.assignmentId === assignment.id);
    if (!response) return false;
    if (response.status === RESPONSE_STATUS.SUBMITTED || isSettled(response)) return false;
    return new Date(assignment.dueDate).getTime() < now;
  }).length;

  const published = versions.filter((item) => item.status === 'published').length;
  const draft = versions.filter((item) => item.status === 'draft').length;

  return {
    templates: templates.length,
    versions: versions.length,
    draft,
    published,
    assigned: assignments.length,
    notStarted: byStatus(RESPONSE_STATUS.NOT_STARTED),
    inProgress: byStatus(RESPONSE_STATUS.IN_PROGRESS),
    submitted: byStatus(RESPONSE_STATUS.SUBMITTED),
    underReview: byStatus(RESPONSE_STATUS.UNDER_REVIEW),
    revisionRequired: byStatus(RESPONSE_STATUS.REVISION_REQUIRED),
    approved: byStatus(RESPONSE_STATUS.APPROVED),
    rejected: byStatus(RESPONSE_STATUS.REJECTED),
    overdue,
  };
}

/** Sebaran respons menurut tingkat risiko, untuk grafik donat. */
export function riskDistribution(scores = []) {
  const buckets = { low: 0, medium: 0, high: 0, critical: 0, unscored: 0 };

  scores.forEach((score) => {
    if (!score || score.total === null) buckets.unscored += 1;
    else buckets[score.riskLevel] = (buckets[score.riskLevel] ?? 0) + 1;
  });

  return buckets;
}

/** Tingkat respons: berapa persen penugasan yang sudah dikirim pemasok. */
export function responseRate(assignments, responses) {
  if (assignments.length === 0) return 0;

  const done = responses.filter(
    (item) =>
      item.status === RESPONSE_STATUS.SUBMITTED ||
      item.status === RESPONSE_STATUS.UNDER_REVIEW ||
      isSettled(item),
  ).length;

  return Math.round((done / assignments.length) * 100);
}
