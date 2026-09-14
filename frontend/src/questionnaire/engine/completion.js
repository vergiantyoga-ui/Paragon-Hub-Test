import { getType } from './questionTypes.js';
import { visibleQuestionIds } from './conditions.js';

/**
 * Perhitungan kelengkapan pengisian.
 *
 * Yang dihitung hanya pertanyaan yang sedang tampak, sehingga persentase tidak
 * melonjak turun ketika sebuah cabang bersyarat terbuka — dan pemasok tidak
 * dituduh belum selesai karena pertanyaan yang tidak berlaku baginya.
 */

export function calculateCompletion(version, answers, attachments = {}) {
  const visible = visibleQuestionIds(version, answers);
  const sections = [];

  let totalRequired = 0;
  let totalAnswered = 0;

  version.sections.forEach((section) => {
    let required = 0;
    let answered = 0;
    let optionalAnswered = 0;
    let optionalTotal = 0;

    section.questions.forEach((question) => {
      if (!visible.has(question.id)) return;

      const type = getType(question.type);
      if (type.isAnswered === undefined) return;

      const filled = isComplete(question, answers[question.id], attachments[question.id], type);

      if (question.required) {
        required += 1;
        if (filled) answered += 1;
      } else {
        optionalTotal += 1;
        if (filled) optionalAnswered += 1;
      }
    });

    totalRequired += required;
    totalAnswered += answered;

    sections.push({
      sectionId: section.id,
      name: section.name,
      requiredTotal: required,
      requiredAnswered: answered,
      optionalTotal,
      optionalAnswered,
      percent: required === 0 ? 100 : Math.round((answered / required) * 100),
      complete: required === 0 || answered === required,
    });
  });

  return {
    percent: totalRequired === 0 ? 100 : Math.round((totalAnswered / totalRequired) * 100),
    requiredTotal: totalRequired,
    requiredAnswered: totalAnswered,
    complete: totalRequired === 0 || totalAnswered === totalRequired,
    sections,
  };
}

/** Sebuah pertanyaan dianggap lengkap bila jawabannya ada dan lampirannya cukup. */
function isComplete(question, value, files, type) {
  // Untuk tipe berkas, lampiran itulah jawabannya (lihat questionTypes.js).
  const effective = type.answerIsAttachment ? files : value;
  if (!type.isAnswered(effective)) return false;

  const rule = question.attachmentRule;
  if (rule?.required && (files ?? []).length === 0) return false;
  return true;
}
