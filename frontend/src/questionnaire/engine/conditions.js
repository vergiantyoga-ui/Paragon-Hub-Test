import { getType } from './questionTypes.js';

/**
 * Mesin kondisi. Menentukan pertanyaan mana yang tampak berdasarkan jawaban
 * yang sudah diisi. Ini murni fungsi, tanpa React, sehingga bisa diuji langsung.
 *
 * Kondisi berbentuk pohon:
 *   { all: [...] }  seluruh anak harus benar
 *   { any: [...] }  salah satu anak cukup
 *   daun            { questionId, operator, value }
 */

/** @param {Object} answers peta questionId → nilai jawaban */
export function evaluateCondition(node, answers) {
  if (!node) return true; // tanpa kondisi berarti selalu tampak

  if (node.all) return node.all.every((child) => evaluateCondition(child, answers));
  if (node.any) return node.any.some((child) => evaluateCondition(child, answers));

  return evaluateLeaf(node, answers);
}

function evaluateLeaf(leaf, answers) {
  const actual = answers[leaf.questionId];

  switch (leaf.operator) {
    case 'answered':
      return !isEmpty(actual);
    case 'notAnswered':
      return isEmpty(actual);
    case 'equals':
      return Array.isArray(actual) ? actual.includes(leaf.value) : actual === leaf.value;
    case 'notEquals':
      return Array.isArray(actual) ? !actual.includes(leaf.value) : actual !== leaf.value;
    case 'in':
      return toArray(leaf.value).some((v) =>
        Array.isArray(actual) ? actual.includes(v) : actual === v,
      );
    case 'notIn':
      return !toArray(leaf.value).some((v) =>
        Array.isArray(actual) ? actual.includes(v) : actual === v,
      );
    case 'gt':
      return Number(actual) > Number(leaf.value);
    case 'lt':
      return Number(actual) < Number(leaf.value);
    default:
      // Operator tak dikenal dianggap tidak terpenuhi, bukan melempar galat,
      // supaya satu kondisi rusak tidak menjatuhkan seluruh questionnaire.
      return false;
  }
}

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const toArray = (value) => (Array.isArray(value) ? value : [value]);

/**
 * Menghitung pertanyaan yang tampak pada seluruh versi.
 * @returns {Set<string>} kumpulan questionId yang tampak
 */
export function visibleQuestionIds(version, answers) {
  const visible = new Set();

  version.sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (evaluateCondition(question.conditions, answers)) visible.add(question.id);
    });
  });

  return visible;
}

/** Pertanyaan yang tampak pada satu seksi, berurutan. */
export function visibleQuestionsOf(section, answers) {
  return section.questions.filter((question) => evaluateCondition(question.conditions, answers));
}

/**
 * Membersihkan jawaban pertanyaan yang menjadi tersembunyi.
 * Dipakai setelah pemasok mengubah jawaban pemicu: jawaban lama pada cabang
 * yang tidak lagi relevan tidak boleh ikut terkirim maupun ikut dihitung.
 */
export function pruneHiddenAnswers(version, answers) {
  const visible = visibleQuestionIds(version, answers);
  const cleaned = {};

  Object.entries(answers).forEach(([questionId, value]) => {
    if (visible.has(questionId)) cleaned[questionId] = value;
  });

  return cleaned;
}

/**
 * Mencari acuan melingkar, misalnya A bergantung pada B sementara B bergantung
 * pada A. Builder memakai ini untuk menolak kondisi yang tidak akan pernah stabil.
 */
export function findCircularDependency(version) {
  const dependsOn = new Map();

  version.sections.forEach((section) => {
    section.questions.forEach((question) => {
      dependsOn.set(question.id, collectRefs(question.conditions));
    });
  });

  const visiting = new Set();
  const done = new Set();
  let cycle = null;

  function walk(id, trail) {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      cycle = [...trail, id];
      return;
    }
    visiting.add(id);
    (dependsOn.get(id) ?? []).forEach((next) => walk(next, [...trail, id]));
    visiting.delete(id);
    done.add(id);
  }

  [...dependsOn.keys()].forEach((id) => {
    if (!cycle) walk(id, []);
  });

  return cycle;
}

function collectRefs(node) {
  if (!node) return [];
  if (node.all) return node.all.flatMap(collectRefs);
  if (node.any) return node.any.flatMap(collectRefs);
  return node.questionId ? [node.questionId] : [];
}

/**
 * Nilai jawaban kosong sesuai tipe soal. Dipakai saat memulai respons baru.
 */
export function emptyAnswersFor(version) {
  const answers = {};
  version.sections.forEach((section) => {
    section.questions.forEach((question) => {
      answers[question.id] = getType(question.type).emptyValue;
    });
  });
  return answers;
}
