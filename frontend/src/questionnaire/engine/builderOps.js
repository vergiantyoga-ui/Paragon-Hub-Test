import { makeId, makeQuestion, makeSection } from './schema.js';
import { copyFromLibrary } from './versioning.js';
import { getType } from './questionTypes.js';
import { collectConditionRefs } from './schema.js';

/**
 * Operasi builder.
 *
 * Semua fungsi di sini murni: menerima sebuah versi, mengembalikan versi baru,
 * dan tidak pernah menyunting masukannya. Alasannya sama seperti modul mesin
 * lain — logika penyuntingan yang terkurung di dalam komponen React tidak bisa
 * diuji, padahal justru di sinilah kesalahan urutan dan rujukan mudah lolos.
 *
 * Seluruh fungsi mengasumsikan versi berstatus draf. Penjagaannya ada pada
 * `canEdit()` di `versioning.js` dan ditegakkan oleh store.
 */

/* ------------------------------------------------------------------ */
/* Pembantu                                                            */
/* ------------------------------------------------------------------ */

const renumber = (items) => items.map((item, index) => ({ ...item, order: index }));

function mapSections(version, fn) {
  return { ...version, sections: renumber(fn(version.sections)) };
}

function mapOneSection(version, sectionId, fn) {
  return {
    ...version,
    sections: version.sections.map((section) =>
      section.id === sectionId ? fn(section) : section,
    ),
  };
}

/** Memindahkan elemen array satu langkah; di luar batas dikembalikan apa adanya. */
function shift(items, index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/* ------------------------------------------------------------------ */
/* Seksi                                                               */
/* ------------------------------------------------------------------ */

export function addSection(version, partial = {}) {
  const section = makeSection({
    name: partial.name ?? `Seksi ${version.sections.length + 1}`,
    ...partial,
  });
  return mapSections(version, (sections) => [...sections, section]);
}

export function updateSection(version, sectionId, patch) {
  return mapOneSection(version, sectionId, (section) => ({ ...section, ...patch }));
}

export function moveSection(version, sectionId, direction) {
  const index = version.sections.findIndex((section) => section.id === sectionId);
  return mapSections(version, (sections) => shift(sections, index, direction));
}

/**
 * Menghapus seksi beserta isinya. Pertanyaan di seksi lain yang kondisinya
 * merujuk pertanyaan yang ikut terhapus dibersihkan, supaya tidak tertinggal
 * kondisi yang menunjuk ke ketiadaan.
 */
export function deleteSection(version, sectionId) {
  const removed = version.sections.find((section) => section.id === sectionId);
  if (!removed) return version;

  const removedIds = new Set(removed.questions.map((question) => question.id));
  const trimmed = mapSections(version, (sections) =>
    sections.filter((section) => section.id !== sectionId),
  );

  return dropConditionsReferencing(trimmed, removedIds);
}

/** Menggandakan seksi beserta seluruh pertanyaannya dengan id baru. */
export function duplicateSection(version, sectionId) {
  const index = version.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return version;

  const source = version.sections[index];
  const copy = {
    ...structuredClone(source),
    id: makeId('sec'),
    name: `${source.name} (salinan)`,
    questions: source.questions.map((question) => ({
      ...structuredClone(question),
      id: makeId('q'),
      options: question.options.map((option) => ({ ...option, id: makeId('opt') })),
      // Kondisi tidak ikut disalin: rujukannya menunjuk pertanyaan asli,
      // dan menyalinnya begitu saja membuat dua cabang bergantung pada satu pemicu.
      conditions: null,
    })),
  };

  return mapSections(version, (sections) => [
    ...sections.slice(0, index + 1),
    copy,
    ...sections.slice(index + 1),
  ]);
}

/* ------------------------------------------------------------------ */
/* Pertanyaan                                                          */
/* ------------------------------------------------------------------ */

export function addQuestion(version, sectionId, typeId) {
  const type = getType(typeId);

  const question = makeQuestion({
    type: typeId,
    text: '',
    options: type.hasOptions ? type.optionPreset() : [],
    attachmentRule: type.defaultAttachmentRule ? type.defaultAttachmentRule() : null,
  });

  return mapOneSection(version, sectionId, (section) => ({
    ...section,
    questions: renumber([...section.questions, question]),
  }));
}

/** Menyisipkan pertanyaan jadi, misalnya salinan dari pustaka soal. */
export function insertQuestion(version, sectionId, question) {
  return mapOneSection(version, sectionId, (section) => ({
    ...section,
    questions: renumber([...section.questions, question]),
  }));
}

export function updateQuestion(version, questionId, patch) {
  return {
    ...version,
    sections: version.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    })),
  };
}

/**
 * Mengganti tipe pertanyaan. Pilihan dan aturan lampiran disesuaikan dengan
 * tipe baru, karena membiarkan pilihan lama pada tipe yang tidak memakainya
 * menghasilkan data yang tidak pernah terpakai namun ikut tersimpan.
 */
export function changeQuestionType(version, questionId, typeId) {
  const type = getType(typeId);

  return updateQuestion(version, questionId, {
    type: typeId,
    options: type.hasOptions ? type.optionPreset() : [],
    validation: {},
    defaultValue: null,
    attachmentRule: type.allowsAttachment
      ? (type.defaultAttachmentRule?.() ?? null)
      : null,
  });
}

export function moveQuestion(version, sectionId, questionId, direction) {
  return mapOneSection(version, sectionId, (section) => {
    const index = section.questions.findIndex((question) => question.id === questionId);
    return { ...section, questions: renumber(shift(section.questions, index, direction)) };
  });
}

export function deleteQuestion(version, questionId) {
  const trimmed = {
    ...version,
    sections: version.sections.map((section) => ({
      ...section,
      questions: renumber(section.questions.filter((question) => question.id !== questionId)),
    })),
  };

  return dropConditionsReferencing(trimmed, new Set([questionId]));
}

export function duplicateQuestion(version, sectionId, questionId) {
  return mapOneSection(version, sectionId, (section) => {
    const index = section.questions.findIndex((question) => question.id === questionId);
    if (index === -1) return section;

    const source = section.questions[index];
    const copy = {
      ...structuredClone(source),
      id: makeId('q'),
      code: source.code ? `${source.code}-COPY` : '',
      options: source.options.map((option) => ({ ...option, id: makeId('opt') })),
      conditions: null,
    };

    return {
      ...section,
      questions: renumber([
        ...section.questions.slice(0, index + 1),
        copy,
        ...section.questions.slice(index + 1),
      ]),
    };
  });
}

/** Memindahkan pertanyaan ke seksi lain. */
export function moveQuestionToSection(version, questionId, targetSectionId) {
  let moved = null;

  const withoutQuestion = version.sections.map((section) => {
    const found = section.questions.find((question) => question.id === questionId);
    if (!found) return section;
    moved = found;
    return {
      ...section,
      questions: renumber(section.questions.filter((question) => question.id !== questionId)),
    };
  });

  if (!moved) return version;

  return {
    ...version,
    sections: withoutQuestion.map((section) =>
      section.id === targetSectionId
        ? { ...section, questions: renumber([...section.questions, moved]) }
        : section,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Pustaka                                                             */
/* ------------------------------------------------------------------ */

/**
 * Menambahkan seksi dari pustaka beserta pertanyaannya.
 * Seluruh isinya disalin sebagai nilai — menyunting pustaka setelah ini
 * tidak boleh merembet ke versi yang sudah memakainya (aturan 13 dan 14).
 */
export function addSectionFromLibrary(version, sectionTemplate, libraryItems) {
  const questions = (sectionTemplate.questionIds ?? [])
    .map((id) => libraryItems.find((item) => item.id === id))
    .filter(Boolean)
    .map(copyFromLibrary);

  const section = makeSection({
    name: sectionTemplate.name,
    questions: questions.map((question, index) => ({ ...question, order: index })),
  });

  return mapSections(version, (sections) => [...sections, section]);
}

/* ------------------------------------------------------------------ */
/* Pengaturan versi                                                    */
/* ------------------------------------------------------------------ */

/**
 * Mengubah pengaturan tingkat versi: skoring, nilai kelulusan, jangka berlaku.
 * Mematikan skoring tidak menghapus bobot dan skor yang sudah diisi, supaya
 * mengaktifkannya kembali tidak berarti menyusun ulang dari nol.
 */
export function updateVersionSettings(version, patch) {
  return { ...version, ...patch };
}

/** Mengubah satu pita klasifikasi risiko. */
export function updateRiskBand(version, bandId, patch) {
  return {
    ...version,
    riskBands: version.riskBands.map((band) =>
      band.id === bandId ? { ...band, ...patch } : band,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Pilihan jawaban                                                     */
/* ------------------------------------------------------------------ */

export function updateOptions(version, questionId, options) {
  return updateQuestion(version, questionId, { options });
}

/* ------------------------------------------------------------------ */
/* Kebersihan rujukan                                                  */
/* ------------------------------------------------------------------ */

/**
 * Membuang kondisi yang merujuk pertanyaan yang sudah tidak ada.
 * Seluruh pohon kondisi dibuang, bukan hanya daunnya, karena kondisi
 * setengah utuh lebih membingungkan daripada tidak ada kondisi sama sekali —
 * dan pengguna tetap melihatnya di panel properti untuk disusun ulang.
 */
export function dropConditionsReferencing(version, removedIds) {
  return {
    ...version,
    sections: version.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => {
        const refs = collectConditionRefs(question.conditions);
        const broken = refs.some((ref) => removedIds.has(ref));
        return broken ? { ...question, conditions: null } : question;
      }),
    })),
  };
}

/**
 * Pertanyaan yang boleh dipakai sebagai pemicu kondisi bagi pertanyaan tertentu:
 * hanya yang berada sebelumnya, supaya tidak tercipta acuan melingkar.
 */
export function eligibleTriggers(version, questionId) {
  const triggers = [];

  for (const section of version.sections) {
    for (const question of section.questions) {
      if (question.id === questionId) return triggers;
      if (question.options?.length) {
        triggers.push({ section, question });
      }
    }
  }

  return triggers;
}

/** Lokasi sebuah pertanyaan, dipakai builder untuk menyorot posisi terpilih. */
export function findQuestion(version, questionId) {
  for (const section of version.sections) {
    const question = section.questions.find((item) => item.id === questionId);
    if (question) return { section, question };
  }
  return null;
}
