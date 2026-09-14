import { makeId, TEMPLATE_STATUS, deepFreeze, assertShape } from './schema.js';

/**
 * Aturan versi.
 *
 * Tiga aturan bisnis yang dijaga di sini:
 *  - Versi terbit tidak boleh disunting langsung (aturan 1 dan 2).
 *  - Respons lama harus tetap menampilkan pertanyaan versi aslinya (aturan 3).
 *  - Perubahan pustaka soal/seksi tidak boleh merembet ke versi terbit
 *    (aturan 13 dan 14) — karena itu penambahan dari pustaka menyalin nilai.
 *
 * Penjaminannya struktural, bukan sekadar kesepakatan: begitu diterbitkan,
 * objek versi dibekukan secara mendalam sehingga percobaan menyuntingnya
 * gagal, bukan diam-diam berhasil.
 */

export function canEdit(version) {
  return version.status === TEMPLATE_STATUS.DRAFT;
}

export function canPublish(version) {
  if (version.status !== TEMPLATE_STATUS.DRAFT) return false;
  return publishBlockers(version).length === 0;
}

/** Alasan sebuah versi belum layak terbit. */
export function publishBlockers(version) {
  const blockers = [];

  const shapeProblems = assertShape(version);
  blockers.push(...shapeProblems);

  if (version.sections.length === 0) {
    blockers.push('Belum ada seksi.');
  }

  const questionCount = countQuestions(version);
  if (questionCount === 0) {
    blockers.push('Belum ada pertanyaan.');
  }

  version.sections.forEach((section) => {
    if (section.questions.length === 0) {
      blockers.push(`Seksi "${section.name}" belum berisi pertanyaan.`);
    }
    section.questions.forEach((question) => {
      if (!question.text?.trim()) {
        blockers.push(`Ada pertanyaan tanpa teks pada seksi "${section.name}".`);
      }
      const type = question.type;
      const needsOptions = ['single_choice', 'multiple_choice', 'dropdown', 'yes_no', 'yes_no_na'];
      if (needsOptions.includes(type) && (question.options?.length ?? 0) < 2) {
        blockers.push(`Pertanyaan "${question.code || question.text}" memerlukan minimal dua pilihan.`);
      }
    });
  });

  if (version.scoringEnabled) {
    const scorable = version.sections.some((section) =>
      section.questions.some((question) => question.options?.some((o) => o.score > 0)),
    );
    if (!scorable) {
      blockers.push('Skoring diaktifkan tetapi belum ada jawaban yang bernilai.');
    }
  }

  return blockers;
}

/** Menerbitkan versi. Mengembalikan salinan beku, bukan menyunting yang lama. */
export function publish(version, actorName, at = new Date().toISOString()) {
  const blockers = publishBlockers(version);
  if (blockers.length > 0) {
    throw new Error(`Versi belum layak terbit: ${blockers[0]}`);
  }

  return deepFreeze({
    ...structuredClone(version),
    status: TEMPLATE_STATUS.PUBLISHED,
    publishedAt: at,
    publishedBy: actorName,
  });
}

export function unpublish(version) {
  return { ...structuredClone(version), status: TEMPLATE_STATUS.UNPUBLISHED };
}

export function archive(version) {
  return { ...structuredClone(version), status: TEMPLATE_STATUS.ARCHIVED };
}

/**
 * Membuat versi baru dari versi terbit. Seluruh isi disalin dengan id baru
 * supaya penyuntingan pada v2 tidak menyentuh v1 sama sekali, termasuk objek
 * bersarang yang mudah terbagi tanpa sengaja.
 */
export function createNextVersion(version, { label } = {}) {
  const clone = structuredClone(version);
  const idMap = new Map();

  const sections = clone.sections.map((section) => {
    const newSectionId = makeId('sec');

    const questions = section.questions.map((question) => {
      const newQuestionId = makeId('q');
      idMap.set(question.id, newQuestionId);

      return {
        ...question,
        id: newQuestionId,
        options: question.options.map((option) => ({ ...option, id: makeId('opt') })),
      };
    });

    return { ...section, id: newSectionId, questions };
  });

  // Kondisi menunjuk id pertanyaan, jadi rujukannya harus ikut dipetakan ulang.
  sections.forEach((section) => {
    section.questions.forEach((question) => {
      question.conditions = remapConditions(question.conditions, idMap);
    });
  });

  return {
    ...clone,
    id: makeId('ver'),
    versionLabel: label ?? bumpLabel(version.versionLabel),
    status: TEMPLATE_STATUS.DRAFT,
    publishedAt: null,
    publishedBy: null,
    sections,
  };
}

function remapConditions(node, idMap) {
  if (!node) return null;
  if (node.all) return { all: node.all.map((child) => remapConditions(child, idMap)) };
  if (node.any) return { any: node.any.map((child) => remapConditions(child, idMap)) };
  return { ...node, questionId: idMap.get(node.questionId) ?? node.questionId };
}

/** v1.0 → v2.0; label bebas bila tidak mengikuti pola. */
export function bumpLabel(label) {
  const match = /^v(\d+)\.(\d+)$/.exec(label ?? '');
  if (!match) return `${label ?? 'v1'} (salinan)`;
  return `v${Number(match[1]) + 1}.0`;
}

export function countQuestions(version) {
  return version.sections.reduce((sum, section) => sum + section.questions.length, 0);
}

export function countSections(version) {
  return version.sections.length;
}

/**
 * Menyalin butir pustaka menjadi pertanyaan milik versi.
 * Nilai disalin, bukan dirujuk, sehingga menyunting pustaka tidak mengubah
 * questionnaire yang sudah memakainya.
 */
export function copyFromLibrary(libraryItem) {
  const clone = structuredClone(libraryItem.question);
  return {
    ...clone,
    id: makeId('q'),
    options: (clone.options ?? []).map((option) => ({ ...option, id: makeId('opt') })),
    conditions: null, // kondisi bergantung pertanyaan lain, tidak ikut disalin
    libraryItemId: libraryItem.id,
  };
}
