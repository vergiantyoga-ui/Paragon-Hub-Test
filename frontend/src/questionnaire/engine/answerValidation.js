import { getType } from './questionTypes.js';
import { visibleQuestionIds } from './conditions.js';

/**
 * Validasi jawaban pemasok.
 *
 * Aturan penting dari spesifikasi: pertanyaan bersyarat hanya wajib ketika
 * sedang tampak. Karena itu setiap pemeriksaan berangkat dari daftar
 * pertanyaan yang tampak, bukan dari seluruh pertanyaan pada versi.
 */

/**
 * @returns {Object<string, string>} peta questionId → pesan galat
 */
export function validateResponse(version, answers, attachments = {}) {
  const visible = visibleQuestionIds(version, answers);
  const errors = {};

  version.sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (!visible.has(question.id)) return;

      const problem = validateAnswer(question, answers[question.id], attachments[question.id]);
      if (problem) errors[question.id] = problem;
    });
  });

  return errors;
}

/** Validasi satu jawaban: wajib, aturan khas tipe, lalu aturan lampiran. */
export function validateAnswer(question, value, files = []) {
  const type = getType(question.type);

  // Tipe berkas tidak menyimpan apa pun di kolom jawaban; daftar lampirannya
  // yang menentukan apakah pertanyaan sudah terjawab.
  const effective = type.answerIsAttachment ? files : value;

  if (question.required && !type.isAnswered(effective)) {
    return type.answerIsAttachment
      ? 'Dokumen pendukung wajib diunggah.'
      : 'Pertanyaan ini wajib dijawab.';
  }

  // Aturan khas tipe hanya berlaku bila sudah ada isian.
  if (!type.answerIsAttachment && type.isAnswered(value)) {
    const problem = type.validate(question, value);
    if (problem) return problem;
  }

  return validateAttachments(question, files);
}

/** Aturan lampiran per pertanyaan: jumlah, ukuran, tipe berkas, kedaluwarsa. */
export function validateAttachments(question, files = []) {
  const rule = question.attachmentRule;
  if (!rule) return null;

  const list = files ?? [];

  if (rule.required && list.length === 0) {
    return 'Dokumen pendukung wajib diunggah.';
  }
  if (list.length > rule.maxFiles) {
    return `Maksimal ${rule.maxFiles} berkas.`;
  }

  for (const file of list) {
    if (rule.allowedTypes?.length && !rule.allowedTypes.includes(file.fileType)) {
      return `Berkas "${file.fileName}" bukan format yang diterima.`;
    }
    if (file.fileSize > rule.maxFileSizeMb * 1024 * 1024) {
      return `Berkas "${file.fileName}" melebihi ${rule.maxFileSizeMb} MB.`;
    }
    if (rule.expiryDateRequired && !file.expiryDate) {
      return `Isi tanggal berlaku untuk berkas "${file.fileName}".`;
    }
    if (rule.expiryDateRequired && file.expiryDate) {
      const daysLeft = Math.ceil((new Date(file.expiryDate) - Date.now()) / 86400000);
      if (daysLeft < 0) {
        return `Berkas "${file.fileName}" sudah kedaluwarsa.`;
      }
      if (rule.expiryMinDays && daysLeft < rule.expiryMinDays) {
        return `Berkas "${file.fileName}" berlaku kurang dari ${rule.expiryMinDays} hari lagi.`;
      }
    }
  }

  return null;
}

/**
 * Ringkasan sebelum pengiriman: daftar pertanyaan yang menghalangi.
 * Dipakai layar konfirmasi agar pemasok tahu persis apa yang kurang.
 */
export function submissionBlockers(version, answers, attachments = {}) {
  const errors = validateResponse(version, answers, attachments);

  return Object.entries(errors).map(([questionId, message]) => {
    const location = locate(version, questionId);
    return {
      questionId,
      sectionName: location?.section.name ?? '',
      questionText: location?.question.text ?? questionId,
      questionCode: location?.question.code ?? '',
      message,
    };
  });
}

export function locate(version, questionId) {
  for (const section of version.sections) {
    const question = section.questions.find((q) => q.id === questionId);
    if (question) return { section, question };
  }
  return null;
}

/** Versi kedaluwarsa tidak boleh dikirim (aturan 9). */
export function isVersionExpired(version, at = new Date()) {
  if (!version.expiryDate) return false;
  return new Date(version.expiryDate) < at;
}
