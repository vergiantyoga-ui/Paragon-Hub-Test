import { getType } from './questionTypes.js';
import { visibleQuestionIds } from './conditions.js';

/**
 * Mesin skor.
 *
 * Skor bersifat opsional per questionnaire (aturan 7). Pertanyaan yang
 * tersembunyi tidak dihitung, dan jawaban yang ditandai N/A dikeluarkan dari
 * pembagi — bukan dihitung sebagai nol — sesuai aturan 8.
 *
 * Skor akhir dinyatakan dalam persen agar dapat dibandingkan antar
 * questionnaire yang skala bobotnya berbeda.
 */

export function calculateScore(version, answers) {
  if (!version.scoringEnabled) return null;

  const visible = visibleQuestionIds(version, answers);
  const sections = [];

  let grandEarned = 0;
  let grandPossible = 0;

  version.sections.forEach((section) => {
    let earned = 0;
    let possible = 0;
    let counted = 0;
    let excluded = 0;

    section.questions.forEach((question) => {
      if (!visible.has(question.id)) return;

      const type = getType(question.type);
      if (!type.supportsScoring) return;

      const raw = type.scoreOf(answers[question.id], question);
      if (raw === null) {
        excluded += 1; // belum dijawab atau ditandai tidak berlaku
        return;
      }

      const max = maxScoreOf(question, type);
      if (max <= 0) return;

      earned += raw * question.weight;
      possible += max * question.weight;
      counted += 1;
    });

    const percent = possible > 0 ? (earned / possible) * 100 : null;

    sections.push({
      sectionId: section.id,
      name: section.name,
      weight: section.weight,
      earned,
      possible,
      percent,
      countedQuestions: counted,
      excludedQuestions: excluded,
    });

    // Bobot seksi diterapkan pada persentase seksi, bukan pada skor mentah,
    // supaya seksi dengan banyak pertanyaan tidak otomatis lebih berpengaruh.
    if (percent !== null) {
      grandEarned += percent * section.weight;
      grandPossible += 100 * section.weight;
    }
  });

  const total = grandPossible > 0 ? (grandEarned / grandPossible) * 100 : null;
  const band = total === null ? null : classify(total, version.riskBands);

  return {
    total: total === null ? null : round(total),
    passed: total === null || version.passingScore === null ? null : total >= version.passingScore,
    band,
    riskLevel: band?.risk ?? null,
    sections,
  };
}

/** Skor tertinggi yang mungkin untuk sebuah pertanyaan. */
export function maxScoreOf(question, type = getType(question.type)) {
  if (question.options?.length) {
    const scores = question.options
      .filter((option) => !option.excludeFromScoring)
      .map((option) => option.score);
    return scores.length ? Math.max(...scores) : 0;
  }
  if (type.supportsScoring) {
    return question.validation?.max ?? 5;
  }
  return 0;
}

export function classify(total, bands = []) {
  return bands.find((band) => total >= band.min && total <= band.max) ?? null;
}

const round = (value) => Math.round(value * 10) / 10;

/**
 * Skor gabungan seorang pemasok dari beberapa questionnaire.
 * Dipakai kartu risiko pemasok pada dashboard.
 */
export function aggregateSupplierScore(scores = []) {
  const valid = scores.filter((s) => typeof s?.total === 'number');
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, s) => sum + s.total, 0) / valid.length;
  return round(total);
}
