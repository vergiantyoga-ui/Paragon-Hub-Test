import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { api } from '../../lib/api.js';
import { useQuestionnaireHydration, useWriteThrough } from '../../store/sync.js';
import { ASSIGNMENTS, RESPONSES } from './assignmentMockData.js';
import {
  QUESTIONNAIRE_TEMPLATES,
  QUESTIONNAIRE_VERSIONS,
  QUESTION_LIBRARY,
  SECTION_LIBRARY,
} from './questionnaireMockData.js';
import {
  REVIEW_DECISION,
  RESPONSE_STATUS,
  TEMPLATE_STATUS,
  nextRevision,
  addQuestion,
  addSection,
  archive,
  canEdit,
  changeQuestionType,
  createNextVersion,
  deleteQuestion,
  deleteSection,
  duplicateQuestion,
  duplicateSection,
  insertQuestion,
  makeId,
  makeTemplate,
  makeVersion,
  moveQuestion,
  moveSection,
  publish,
  unpublish,
  updateQuestion,
  updateSection,
  updateVersionSettings,
  updateRiskBand,
  addSectionFromLibrary,
  copyFromLibrary,
} from '../engine/index.js';

/**
 * Store questionnaire, terpisah dari `AppStore` pendaftaran pemasok.
 *
 * Dipisah karena dua alasan: `AppStore` sudah padat, dan siklus hidup
 * questionnaire tidak bersinggungan dengan siklus hidup pendaftaran selain
 * lewat identitas pemasok. Memisahkannya membuat kedua alur bisa ditelusuri
 * sendiri-sendiri.
 */

const StateContext = createContext(null);
const ActionsContext = createContext(null);

const now = () => new Date().toISOString();

const initialState = {
  templates: QUESTIONNAIRE_TEMPLATES,
  versions: QUESTIONNAIRE_VERSIONS,
  questionLibrary: QUESTION_LIBRARY,
  sectionLibrary: SECTION_LIBRARY,
  assignments: ASSIGNMENTS,
  responses: RESPONSES,
  notifications: [],
  auditLog: [],
  hydrated: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const payload = action.payload ?? {};
      // Koleksi kosong dari server tidak menimpa data contoh: basis data yang
      // belum di-seed sebaiknya tidak membuat layar kosong tanpa penjelasan.
      const keep = (next, current) => (next?.length ? next : current);
      return {
        ...state,
        templates: keep(payload.templates, state.templates),
        versions: keep(payload.versions, state.versions),
        questionLibrary: keep(payload.questionLibrary, state.questionLibrary),
        sectionLibrary: keep(payload.sectionLibrary, state.sectionLibrary),
        assignments: keep(payload.assignments, state.assignments),
        responses: keep(payload.responses, state.responses),
        notifications: payload.notifications ?? state.notifications,
        auditLog: payload.auditLog ?? state.auditLog,
        hydrated: true,
      };
    }

    case 'ADD_TEMPLATE':
      return {
        ...state,
        templates: [action.template, ...state.templates],
        versions: [action.version, ...state.versions],
      };

    case 'PATCH_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map((template) =>
          template.id === action.id
            ? { ...template, ...action.patch, updatedAt: now() }
            : template,
        ),
      };

    case 'REPLACE_VERSION':
      return {
        ...state,
        versions: state.versions.map((version) =>
          version.id === action.version.id ? action.version : version,
        ),
      };

    case 'ADD_VERSION':
      return { ...state, versions: [action.version, ...state.versions] };

    case 'ADD_ASSIGNMENT':
      return {
        ...state,
        assignments: [action.assignment, ...state.assignments],
        responses: [action.response, ...state.responses],
      };

    case 'PATCH_RESPONSE':
      return {
        ...state,
        responses: state.responses.map((response) =>
          response.id === action.id
            ? {
                ...response,
                ...action.patch,
                history: action.historyEntry
                  ? [...response.history, action.historyEntry]
                  : response.history,
              }
            : response,
        ),
      };

    case 'NOTIFY':
      return { ...state, notifications: [action.notification, ...state.notifications] };

    case 'READ_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.id ? { ...item, read: true } : item,
        ),
      };

    case 'READ_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.map((item) => ({ ...item, read: true })),
      };

    case 'LOG':
      return { ...state, auditLog: [action.entry, ...state.auditLog] };

    default:
      return state;
  }
}

export function QuestionnaireStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* ----------------- Penyambungan ke basis data ----------------- */

  // Setiap koleksi punya jalur simpannya sendiri. Endpoint-nya upsert, jadi
  // entitas yang baru dibuat dan yang baru disunting melewati jalur yang sama.
  const resetTemplates = useWriteThrough(state.templates, (template) =>
    api.questionnaires.saveTemplate(template),
  );
  const resetVersions = useWriteThrough(state.versions, (version) =>
    api.questionnaires.saveVersion(version),
  );
  const resetAssignments = useWriteThrough(state.assignments, (assignment) =>
    api.assignments.save(assignment),
  );
  const resetResponses = useWriteThrough(state.responses, (response) =>
    api.responses.save(response),
  );
  const resetNotifications = useWriteThrough(state.notifications, (notification) =>
    api.notifications.create(notification),
  );
  const resetAuditLog = useWriteThrough(state.auditLog, (entry) => api.audit.record(entry));

  /**
   * Hidrasi dipicu dari `AppStoreProvider` lewat peristiwa, bukan panggilan
   * bootstrap kedua: keduanya dimuat oleh permintaan yang sama, dan dua
   * permintaan untuk data yang sama hanya menambah waktu tunggu.
   */
  const hydrate = useCallback(
    (payload) => {
      resetTemplates(payload.templates);
      resetVersions(payload.versions);
      resetAssignments(payload.assignments);
      resetResponses(payload.responses);
      resetNotifications(payload.notifications);
      resetAuditLog(payload.auditLog);
      dispatch({ type: 'HYDRATE', payload });
    },
    [
      resetTemplates,
      resetVersions,
      resetAssignments,
      resetResponses,
      resetNotifications,
      resetAuditLog,
    ],
  );

  useQuestionnaireHydration(hydrate);

  /** Setiap tindakan penting dicatat, sesuai bagian 22 spesifikasi. */
  const log = useCallback((actor, actionName, objectType, objectId, previous, next) => {
    dispatch({
      type: 'LOG',
      entry: {
        id: makeId('log'),
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? 'Sistem',
        action: actionName,
        objectType,
        objectId,
        previousValue: previous ?? null,
        newValue: next ?? null,
        at: now(),
      },
    });
  }, []);

  /**
   * Peristiwa notifikasi. Pengiriman email adalah pekerjaan server; yang ada
   * di sini hanya notifikasi dalam aplikasi beserta pemicunya, supaya
   * penyambungan penyedia email kelak tidak perlu mengubah alur.
   */
  const notify = useCallback((event, audience, title, body, link) => {
    dispatch({
      type: 'NOTIFY',
      notification: {
        id: makeId('ntf'),
        event,
        audience, // 'internal' | 'supplier'
        title,
        body,
        link: link ?? null,
        read: false,
        at: now(),
      },
    });
  }, []);

  const actions = useMemo(
    () => ({
      /* ----------------------- Template ----------------------- */
      createTemplate(input, actor) {
        const template = makeTemplate({
          ...input,
          ownerId: actor?.id ?? '',
          ownerName: actor?.name ?? '',
        });
        const version = makeVersion({
          templateId: template.id,
          scoringEnabled: Boolean(input.scoringEnabled),
        });

        dispatch({ type: 'ADD_TEMPLATE', template, version });
        log(actor, 'questionnaire.created', 'template', template.id, null, template.name);

        return { template, version };
      },

      updateTemplate(id, patch, actor) {
        dispatch({ type: 'PATCH_TEMPLATE', id, patch });
        log(actor, 'questionnaire.edited', 'template', id, null, JSON.stringify(patch));
      },

      duplicateTemplate(templateId, actor) {
        const source = state.templates.find((t) => t.id === templateId);
        const sourceVersion = latestVersionOf(state.versions, templateId);
        if (!source || !sourceVersion) return null;

        const template = makeTemplate({
          ...source,
          id: undefined,
          code: `${source.code}-COPY`,
          name: `${source.name} (salinan)`,
          ownerId: actor?.id ?? '',
          ownerName: actor?.name ?? '',
        });
        const version = {
          ...createNextVersion(sourceVersion, { label: 'v1.0' }),
          templateId: template.id,
        };

        dispatch({ type: 'ADD_TEMPLATE', template, version });
        log(actor, 'questionnaire.duplicated', 'template', template.id, source.name, template.name);

        return { template, version };
      },

      /* ---------------------- Penugasan ----------------------- */
      createAssignment(input, actor) {
        const assignment = {
          id: makeId('asg'),
          ...input,
          assignedBy: actor?.name ?? '',
          assignedAt: now(),
        };
        const response = {
          id: makeId('res'),
          assignmentId: assignment.id,
          status: RESPONSE_STATUS.NOT_STARTED,
          startedAt: null,
          submittedAt: null,
          answers: {},
          attachments: {},
          revision: 1,
          history: [],
        };

        dispatch({ type: 'ADD_ASSIGNMENT', assignment, response });
        log(actor, 'questionnaire.assigned', 'assignment', assignment.id, null, input.supplierName);
        notify(
          'assignment.created',
          'supplier',
          'Kuesioner baru ditugaskan',
          `${input.supplierName} menerima penugasan dengan tenggat ${new Date(input.dueDate).toLocaleDateString('id-ID')}.`,
          '/portal/kuesioner',
        );

        return { assignment, response };
      },

      /* --------------------- Respons pemasok ------------------- */
      startResponse(responseId, actorName) {
        dispatch({
          type: 'PATCH_RESPONSE',
          id: responseId,
          patch: { status: RESPONSE_STATUS.IN_PROGRESS, startedAt: now() },
          historyEntry: { at: now(), label: 'Pengisian dimulai', actor: actorName },
        });
      },

      /**
       * Menyimpan draf. Jawaban pada cabang yang menjadi tersembunyi ikut
       * dibuang di sini, supaya data yang tidak lagi relevan tidak terbawa
       * sampai pengiriman maupun perhitungan skor.
       */
      saveDraft(responseId, answers, attachments) {
        dispatch({
          type: 'PATCH_RESPONSE',
          id: responseId,
          patch: { answers, attachments, status: RESPONSE_STATUS.IN_PROGRESS },
        });
      },

      submitResponse(responseId, actorName) {
        const response = state.responses.find((item) => item.id === responseId);
        const isResubmission = (response?.reviews ?? []).length > 0;

        dispatch({
          type: 'PATCH_RESPONSE',
          id: responseId,
          patch: {
            status: RESPONSE_STATUS.SUBMITTED,
            submittedAt: now(),
            revision: isResubmission ? nextRevision(response) : response?.revision ?? 1,
          },
          historyEntry: {
            at: now(),
            label: isResubmission ? 'Revisi dikirim ulang' : 'Kuesioner dikirim',
            actor: actorName,
          },
        });

        notify(
          'response.submitted',
          'internal',
          isResubmission ? 'Revisi kuesioner diterima' : 'Kuesioner dikirim pemasok',
          `${actorName} mengirimkan kuesioner untuk ditinjau.`,
          '/internal/tinjauan',
        );
      },

      /* ---------------------- Tinjauan ------------------------ */
      startReview(responseId, actor) {
        dispatch({
          type: 'PATCH_RESPONSE',
          id: responseId,
          patch: { status: RESPONSE_STATUS.UNDER_REVIEW },
          historyEntry: { at: now(), label: 'Tinjauan dimulai', actor: actor?.name ?? '' },
        });
      },

      /**
       * Menyelesaikan satu putaran tinjauan. Keputusan, komentar, dan salinan
       * jawaban saat ditinjau disimpan sebagai satu entri riwayat yang tidak
       * pernah dihapus — dasar bagi pemeriksaan apakah revisi benar diperbaiki.
       */
      decideReview(responseId, { decision, flagged = [], comments = [], note }, actor) {
        const response = state.responses.find((item) => item.id === responseId);
        if (!response) return { ok: false, message: 'Respons tidak ditemukan.' };

        const review = {
          id: makeId('rev'),
          revision: response.revision ?? 1,
          decision,
          note: note ?? '',
          reviewerId: actor?.id ?? null,
          reviewerName: actor?.name ?? '',
          decidedAt: now(),
          flagged: flagged.map((item) => ({
            ...item,
            attachmentSnapshot: response.attachments[item.questionId] ?? [],
          })),
          comments,
          answerSnapshot: { ...response.answers },
        };

        const status =
          decision === REVIEW_DECISION.APPROVE
            ? RESPONSE_STATUS.APPROVED
            : decision === REVIEW_DECISION.REJECT
              ? RESPONSE_STATUS.REJECTED
              : RESPONSE_STATUS.REVISION_REQUIRED;

        const label =
          decision === REVIEW_DECISION.APPROVE
            ? 'Kuesioner disetujui'
            : decision === REVIEW_DECISION.REJECT
              ? 'Kuesioner ditolak'
              : `Revisi diminta untuk ${flagged.length} pertanyaan`;

        dispatch({
          type: 'PATCH_RESPONSE',
          id: responseId,
          patch: { status, reviews: [...(response.reviews ?? []), review] },
          historyEntry: { at: now(), label, actor: actor?.name ?? '' },
        });

        log(actor, `review.${decision}`, 'response', responseId, response.status, status);

        notify(
          `review.${decision}`,
          'supplier',
          label,
          decision === REVIEW_DECISION.REVISION
            ? 'Sebagian jawaban perlu diperbaiki. Buka kuesioner untuk melihat catatannya.'
            : note || 'Buka kuesioner untuk melihat rinciannya.',
          '/portal/kuesioner',
        );

        return { ok: true };
      },

      markNotificationRead(id) {
        dispatch({ type: 'READ_NOTIFICATION', id });
      },

      markAllNotificationsRead() {
        dispatch({ type: 'READ_ALL_NOTIFICATIONS' });
      },

      /* ----------------------- Builder ------------------------ */
      /**
       * Seluruh penyuntingan struktur lewat satu pintu. Versi yang bukan draf
       * ditolak di sini, sehingga aturan "versi terbit tidak dapat disunting"
       * tidak bergantung pada tombol yang kebetulan disembunyikan di antarmuka.
       */
      editVersion(versionId, operation, actor, logLabel) {
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return { ok: false, message: 'Versi tidak ditemukan.' };
        if (!canEdit(version)) {
          return { ok: false, message: 'Versi yang sudah terbit tidak dapat disunting.' };
        }

        const next = operation(version);
        dispatch({ type: 'REPLACE_VERSION', version: next });
        if (logLabel) log(actor, logLabel, 'version', versionId, null, null);

        return { ok: true, version: next };
      },

      /* ------------------------ Versi ------------------------- */
      saveVersion(version, actor) {
        dispatch({ type: 'REPLACE_VERSION', version: { ...version } });
        log(actor, 'questionnaire.version_saved', 'version', version.id, null, version.versionLabel);
      },

      publishVersion(versionId, actor) {
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return { ok: false, message: 'Versi tidak ditemukan.' };

        try {
          const published = publish(version, actor?.name ?? 'Sistem');
          dispatch({ type: 'REPLACE_VERSION', version: published });
          log(actor, 'questionnaire.published', 'version', versionId, version.status, 'published');
          return { ok: true, version: published };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },

      unpublishVersion(versionId, actor) {
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return;
        dispatch({ type: 'REPLACE_VERSION', version: unpublish(version) });
        log(actor, 'questionnaire.unpublished', 'version', versionId, version.status, 'unpublished');
      },

      archiveVersion(versionId, actor) {
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return;
        dispatch({ type: 'REPLACE_VERSION', version: archive(version) });
        log(actor, 'questionnaire.archived', 'version', versionId, version.status, 'archived');
      },

      /* Pembungkus tipis agar halaman builder tidak perlu mengenal engine. */
      addSection(versionId, actor) {
        return this.editVersion(versionId, (v) => addSection(v), actor, 'question.section_added');
      },
      updateSection(versionId, sectionId, patch, actor) {
        return this.editVersion(versionId, (v) => updateSection(v, sectionId, patch), actor);
      },
      moveSection(versionId, sectionId, direction, actor) {
        return this.editVersion(versionId, (v) => moveSection(v, sectionId, direction), actor);
      },
      deleteSection(versionId, sectionId, actor) {
        return this.editVersion(versionId, (v) => deleteSection(v, sectionId), actor, 'question.section_deleted');
      },
      duplicateSection(versionId, sectionId, actor) {
        return this.editVersion(versionId, (v) => duplicateSection(v, sectionId), actor, 'question.section_duplicated');
      },

      updateVersionSettings(versionId, patch, actor) {
        return this.editVersion(versionId, (v) => updateVersionSettings(v, patch), actor, 'questionnaire.settings_changed');
      },
      updateRiskBand(versionId, bandId, patch, actor) {
        return this.editVersion(versionId, (v) => updateRiskBand(v, bandId, patch), actor);
      },
      addSectionFromLibrary(versionId, sectionTemplate, actor) {
        return this.editVersion(
          versionId,
          (v) => addSectionFromLibrary(v, sectionTemplate, state.questionLibrary),
          actor,
          'question.section_added_from_library',
        );
      },

      addQuestion(versionId, sectionId, typeId, actor) {
        return this.editVersion(versionId, (v) => addQuestion(v, sectionId, typeId), actor, 'question.added');
      },
      addFromLibrary(versionId, sectionId, libraryItem, actor) {
        return this.editVersion(
          versionId,
          (v) => insertQuestion(v, sectionId, copyFromLibrary(libraryItem)),
          actor,
          'question.added_from_library',
        );
      },
      updateQuestion(versionId, questionId, patch, actor) {
        return this.editVersion(versionId, (v) => updateQuestion(v, questionId, patch), actor);
      },
      changeQuestionType(versionId, questionId, typeId, actor) {
        return this.editVersion(versionId, (v) => changeQuestionType(v, questionId, typeId), actor);
      },
      moveQuestion(versionId, sectionId, questionId, direction, actor) {
        return this.editVersion(versionId, (v) => moveQuestion(v, sectionId, questionId, direction), actor);
      },
      deleteQuestion(versionId, questionId, actor) {
        return this.editVersion(versionId, (v) => deleteQuestion(v, questionId), actor, 'question.deleted');
      },
      duplicateQuestion(versionId, sectionId, questionId, actor) {
        return this.editVersion(versionId, (v) => duplicateQuestion(v, sectionId, questionId), actor, 'question.duplicated');
      },

      createNewVersion(versionId, actor) {
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return null;

        const next = createNextVersion(version);
        dispatch({ type: 'ADD_VERSION', version: next });
        log(
          actor,
          'questionnaire.version_created',
          'version',
          next.id,
          version.versionLabel,
          next.versionLabel,
        );

        return next;
      },
    }),
    [log, notify, state.templates, state.versions, state.questionLibrary, state.responses],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useQuestionnaireState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useQuestionnaireState harus dipakai di dalam QuestionnaireStoreProvider.');
  return ctx;
}

export function useQuestionnaireActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useQuestionnaireActions harus dipakai di dalam QuestionnaireStoreProvider.');
  return ctx;
}

/* -------------------------- Pembantu -------------------------- */

/** Menggabungkan penugasan dengan respons dan versinya. */
export function assignmentView(state, assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return null;

  return {
    assignment,
    response: state.responses.find((item) => item.assignmentId === assignmentId) ?? null,
    version: state.versions.find((item) => item.id === assignment.versionId) ?? null,
    template: state.templates.find((item) => item.id === assignment.templateId) ?? null,
  };
}

/** Seluruh penugasan milik satu pemasok, lengkap dengan respons dan versinya. */
export function assignmentsForSupplier(state, supplierId) {
  return state.assignments
    .filter((assignment) => assignment.supplierId === supplierId)
    .map((assignment) => assignmentView(state, assignment.id));
}

export function versionsOf(versions, templateId) {
  return versions
    .filter((version) => version.templateId === templateId)
    .sort((a, b) => b.versionLabel.localeCompare(a.versionLabel, undefined, { numeric: true }));
}

export function latestVersionOf(versions, templateId) {
  return versionsOf(versions, templateId)[0] ?? null;
}

/**
 * Versi yang mewakili sebuah template pada daftar: yang terbit bila ada,
 * selain itu yang terbaru. Daftar template menampilkan status ini.
 */
export function representativeVersion(versions, templateId) {
  const all = versionsOf(versions, templateId);
  return all.find((v) => v.status === TEMPLATE_STATUS.PUBLISHED) ?? all[0] ?? null;
}
