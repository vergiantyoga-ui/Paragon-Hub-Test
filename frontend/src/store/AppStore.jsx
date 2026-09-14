import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { PATH, ROLE, STATUS } from '../lib/constants.js';
import { INTERNAL_USERS, SUBMISSIONS } from '../lib/mockData.js';
import { buildAccountId, buildInviteToken, buildTempPassword } from '../lib/format.js';
import { VENDOR_TYPES, labelOf } from '../lib/masterData.js';
import { api, getToken } from '../lib/api.js';
import { publishBootstrap, useBootstrap, useWriteThrough, useWriteThroughMap } from './sync.js';

/**
 * Store tunggal untuk seluruh aplikasi. Tanpa backend: setiap aksi
 * memindahkan pengajuan antar status persis seperti yang digambarkan
 * pada dokumen flow, sehingga demo bisa menelusuri jalur dari ujung ke ujung.
 */

const AppStateContext = createContext(null);
const AppActionsContext = createContext(null);

const now = () => new Date().toISOString();

const initialState = {
  submissions: SUBMISSIONS,
  qualifications: {}, // supplierId → { lines, status, updatedAt, updatedBy }
  internalUsers: INTERNAL_USERS,
  session: null, // { kind: 'internal' | 'supplier', user }
  /**
   * Data contoh dipakai sampai jawaban server tiba, lalu digantikan. Dengan
   * begitu aplikasi tidak pernah menampilkan layar kosong, dan tetap dapat
   * ditelusuri seutuhnya bila backend memang tidak dijalankan.
   */
  hydrated: false,
};

function patchSubmission(state, id, patch, timelineEntry) {
  return {
    ...state,
    submissions: state.submissions.map((s) => {
      if (s.id !== id) return s;
      const next = typeof patch === 'function' ? patch(s) : patch;
      return {
        ...s,
        ...next,
        timeline: timelineEntry ? [...s.timeline, timelineEntry] : s.timeline,
      };
    }),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        submissions: action.payload.submissions ?? state.submissions,
        qualifications: action.payload.qualifications ?? state.qualifications,
        internalUsers: action.payload.internalUsers?.length
          ? action.payload.internalUsers
          : state.internalUsers,
        hydrated: true,
      };

    case 'SIGN_IN':
      return { ...state, session: action.session };

    case 'SIGN_OUT':
      return { ...state, session: null };

    case 'REGISTER_SUPPLIER':
      return { ...state, submissions: [action.submission, ...state.submissions] };

    case 'PATCH':
      return patchSubmission(state, action.id, action.patch, action.timelineEntry);

    case 'SAVE_QUALIFICATION':
      return {
        ...state,
        qualifications: { ...state.qualifications, [action.supplierId]: action.qualification },
      };

    default:
      return state;
  }
}

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const patch = useCallback((id, next, timelineEntry) => {
    dispatch({ type: 'PATCH', id, patch: next, timelineEntry });
  }, []);

  /* ----------------- Penyambungan ke basis data ----------------- */

  // Pengajuan yang berubah dikirim ke server setelah reducer selesai.
  // Pendaftaran mandiri terjadi sebelum pemasok punya akun, jadi tanpa token
  // jalurnya adalah endpoint pendaftaran yang memang terbuka. Keduanya
  // menyertakan id, sehingga pengiriman berulang tidak menggandakan data.
  const resetSubmissionSync = useWriteThrough(state.submissions, (submission) =>
    getToken() ? api.suppliers.save(submission) : api.suppliers.register(submission),
  );

  const resetQualificationSync = useWriteThroughMap(
    state.qualifications,
    (supplierId, qualification) =>
      api.suppliers.saveQualification(supplierId, {
        lines: qualification.lines,
        status: qualification.status,
      }),
  );

  useBootstrap((payload) => {
    resetSubmissionSync(payload.submissions);
    resetQualificationSync(payload.qualifications);
    dispatch({ type: 'HYDRATE', payload });
    publishBootstrap(payload);
  });

  const actions = useMemo(() => {
    const entry = (label, actor) => ({ at: now(), label, actor });

    return {
      /* ---------------- Sesi ---------------- */
      /**
       * Masuk tetap sinkron dari sudut pandang halaman: pencocokan dilakukan
       * terhadap direktori yang sudah dimuat, sementara permintaan token
       * berjalan di belakang. Klien API menahan permintaan tulis berikutnya
       * sampai token itu tiba, jadi tidak ada perlombaan yang perlu diurus
       * di sini.
       */
      signInInternal(email) {
        const user = state.internalUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (!user) return { ok: false, message: 'Akun tidak ditemukan pada direktori Paragon.' };

        api.auth
          .loginInternal(user.email)
          .catch((error) => console.warn('[auth] gagal mengambil token:', error.message));

        dispatch({ type: 'SIGN_IN', session: { kind: 'internal', user } });
        return { ok: true, user };
      },

      signInSupplier(accountId) {
        const target = accountId.trim().toLowerCase();
        const live = state.submissions.find(
          (s) => s.account?.accountId?.toLowerCase() === target,
        );
        if (!live) {
          return { ok: false, message: 'ID akun belum terdaftar atau undangan belum dikirim.' };
        }
        api.auth
          .loginSupplier(live.account.accountId)
          .catch((error) => console.warn('[auth] gagal mengambil token:', error.message));

        dispatch({
          type: 'SIGN_IN',
          session: {
            kind: 'supplier',
            user: { name: live.contact.name, email: live.contact.email },
            submissionId: live.id,
          },
        });
        return { ok: true, submission: live };
      },

      signOut() {
        api.auth.logout();
        dispatch({ type: 'SIGN_OUT' });
      },

      /* ---------------- Registrasi pemasok ---------------- */
      registerSupplier(payload) {
        const id = `SUP-2026-${String(150 + state.submissions.length).padStart(4, '0')}`;
        dispatch({
          type: 'REGISTER_SUPPLIER',
          submission: {
            id,
            status: STATUS.SUPPLIER_REQUEST,
            submittedAt: now(),
            ...payload,
            onboardingPath: null,
            account: null,
            consent: null,
            verification: null,
            timeline: [entry('Registrasi dikirim pemasok', payload.contact.name)],
          },
        });
        return id;
      },

      /* ---------------- Keputusan staf ---------------- */
      approveSubmission(id, actor) {
        patch(
          id,
          { status: STATUS.APPROVED, decidedAt: now() },
          entry('Registrasi disetujui', actor.name),
        );
      },

      rejectSubmission(id, reason, actor) {
        patch(
          id,
          { status: STATUS.REJECTED, decidedAt: now(), rejectReason: reason },
          entry('Registrasi ditolak', actor.name),
        );
      },

      /* ---------------- Jalur A: undang pemasok ---------------- */
      inviteSupplier(id, actor) {
        const submission = state.submissions.find((s) => s.id === id);
        const account = {
          accountId: buildAccountId(labelOf(VENDOR_TYPES, submission.general.vendorType), id),
          temporaryPassword: buildTempPassword(),
          inviteToken: buildInviteToken(),
          emailSentAt: now(),
          passwordChanged: false,
        };
        patch(
          id,
          { status: STATUS.INVITED, onboardingPath: PATH.INVITE, account },
          entry('Undangan portal dikirim', actor.name),
        );
        return account;
      },

      /* ---------------- Jalur B: registrasi internal ---------------- */
      startInternalRegistration(id, documentSource, actor) {
        patch(
          id,
          {
            status: STATUS.INTERNAL_DRAFT,
            onboardingPath: PATH.INTERNAL,
            documentSource,
            internalDraft: { startedAt: now(), filledBy: actor.name },
          },
          entry('Jalur registrasi internal dipilih', actor.name),
        );
      },

      saveProfileSection(id, sectionId, values, filledBy) {
        patch(id, (s) => ({
          // Begitu pemasok menyentuh profilnya, status berpindah dari "diundang"
          // ke "melengkapi profil". Isian admin pada jalur internal tidak
          // mengubah status, karena masih menunggu approval manager.
          ...(filledBy === 'supplier' && [STATUS.INVITED, STATUS.CONNECTED].includes(s.status)
            ? { status: STATUS.ONBOARDING }
            : {}),
          profile: {
            ...s.profile,
            [sectionId]: values,
            completed: { ...s.profile.completed, [sectionId]: true },
            filledBy: { ...(s.profile.filledBy ?? {}), [sectionId]: filledBy },
          },
        }));
      },

      /** Menyunting salah satu bagian data pendaftaran (general/address/contact). */
      updateRegistrationSection(id, sectionId, values, actor) {
        patch(
          id,
          { [sectionId]: values },
          entry(`Data pendaftaran diperbarui (${sectionId})`, actor),
        );
      },

      /**
       * Menyelesaikan registrasi internal. Sejak persyaratan diubah, tahap ini
       * tidak lagi melewati persetujuan manager: begitu staf merampungkan profil,
       * akun pemasok langsung dibuat dan undangannya dikirim.
       */
      finishInternalRegistration(id, actor) {
        const submission = state.submissions.find((s) => s.id === id);
        const account = {
          accountId: buildAccountId(labelOf(VENDOR_TYPES, submission.general.vendorType), id),
          temporaryPassword: buildTempPassword(),
          inviteToken: buildInviteToken(),
          emailSentAt: now(),
          passwordChanged: false,
        };
        patch(
          id,
          (s) => ({
            status: STATUS.CONNECTED,
            account,
            internalDraft: { ...s.internalDraft, completedAt: now() },
            editRightsTransferredAt: now(),
          }),
          entry('Registrasi internal selesai, akun dikirim ke pemasok', actor.name),
        );
        return account;
      },

      /* ---------------- Preferred supplier ---------------- */

      /** Mengajukan pemasok ke manager untuk dinilai sebagai preferred supplier. */
      submitForPreferred(id, actor) {
        patch(
          id,
          { status: STATUS.AWAITING_PREFERRED, preferredSubmittedAt: now(), preferredSubmittedBy: actor.name },
          entry('Diajukan sebagai preferred supplier', actor.name),
        );
      },

      approvePreferred(id, note, actor) {
        patch(
          id,
          {
            status: STATUS.PREFERRED,
            preferredDecision: { decision: 'approved', note, decidedAt: now(), decidedBy: actor.name },
          },
          entry('Ditetapkan sebagai preferred supplier', actor.name),
        );
      },

      disqualifySupplier(id, reason, actor) {
        patch(
          id,
          {
            status: STATUS.DISQUALIFIED,
            preferredDecision: { decision: 'disqualified', note: reason, decidedAt: now(), decidedBy: actor.name },
          },
          entry('Pemasok didiskualifikasi', actor.name),
        );
      },

      /** Mengembalikan pemasok yang didiskualifikasi ke tahap qualification. */
      reopenQualification(id, actor) {
        patch(
          id,
          { status: STATUS.QUALIFICATION, preferredDecision: null },
          entry('Dikembalikan ke tahap qualification', actor.name),
        );
      },

      /* ---------------- Onboarding pemasok ---------------- */
      changePassword(id, newPassword) {
        if (newPassword) {
          api.auth
            .changePassword(newPassword)
            .catch((error) => console.warn('[auth] gagal menyimpan kata sandi:', error.message));
        }
        patch(id, (s) => ({
          status: STATUS.ONBOARDING,
          account: { ...s.account, passwordChanged: true, temporaryPassword: undefined },
        }));
      },

      acceptConsent(id, acceptedBy, version, path) {
        patch(
          id,
          {
            status: STATUS.REGISTRATION,
            consent: {
              gtcAcceptedAt: now(),
              dataAccuracyAcceptedAt: now(),
              acceptedBy,
              version,
              path,
            },
            verification: { status: 'pending', notes: [] },
          },
          entry('Persetujuan ditandatangani pemasok', acceptedBy),
        );
      },

      /* ---------------- Verifikasi dokumen ---------------- */
      verifyDocuments(id, actor) {
        patch(
          id,
          {
            status: STATUS.QUALIFICATION,
            registeredAt: now(),
            verification: { status: 'verified', verifiedAt: now(), verifiedBy: actor.name, notes: [] },
          },
          entry('Dokumen lolos periksa, lanjut ke tahap qualification', actor.name),
        );
      },

      requestDocumentFix(id, notes, actor) {
        patch(
          id,
          {
            status: STATUS.NEEDS_DOCUMENT_FIX,
            verification: { status: 'revision_requested', requestedAt: now(), requestedBy: actor.name, notes },
          },
          entry('Perbaikan dokumen diminta', actor.name),
        );
      },

      resubmitDocuments(id, actor) {
        patch(
          id,
          { status: STATUS.REGISTRATION, verification: { status: 'pending', notes: [] } },
          entry('Dokumen diunggah ulang pemasok', actor),
        );
      },

      /* ---------------- Perubahan profil setelah aktif ---------------- */
      updateActiveProfile(id, sectionId, values, needsReverification, actor) {
        patch(
          id,
          (s) => ({
            profile: { ...s.profile, [sectionId]: values },
            ...(needsReverification
              ? {
                  status: STATUS.REGISTRATION,
                  verification: { status: 'pending', notes: [], triggeredBySection: sectionId },
                }
              : {}),
          }),
          entry(
            needsReverification
              ? `Perubahan ${sectionId} dikirim untuk verifikasi ulang`
              : `Perubahan ${sectionId} disimpan`,
            actor,
          ),
        );
      },

      /**
       * Menyimpan kualifikasi pemasok. Baris kosong dibuang di sini supaya
       * baris sisa saat mengisi tidak ikut tersimpan sebagai data.
       */
      saveQualification(supplierId, lines, status, actor) {
        const kept = lines.filter(
          (line) => line.commodityCode || line.countryCode || line.notes?.trim(),
        );

        dispatch({
          type: 'SAVE_QUALIFICATION',
          supplierId,
          qualification: {
            lines: kept,
            status,
            updatedAt: now(),
            updatedBy: actor?.name ?? '',
          },
        });

        patch(
          supplierId,
          {},
          entry(
            status === 'completed'
              ? `Kualifikasi diselesaikan (${kept.length} baris)`
              : 'Draf kualifikasi disimpan',
            actor?.name ?? '',
          ),
        );
      },

      resendInvite(id, actor) {
        patch(
          id,
          (s) => ({
            account: {
              ...s.account,
              temporaryPassword: buildTempPassword(),
              emailSentAt: now(),
              passwordChanged: false,
            },
          }),
          entry('Undangan dikirim ulang', actor.name),
        );
      },
    };
  }, [patch, state.submissions, state.internalUsers]);

  return (
    <AppStateContext.Provider value={state}>
      <AppActionsContext.Provider value={actions}>{children}</AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState harus dipakai di dalam AppStoreProvider.');
  return ctx;
}

export function useAppActions() {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error('useAppActions harus dipakai di dalam AppStoreProvider.');
  return ctx;
}

export function useSession() {
  return useAppState().session;
}

export function useCurrentSubmission() {
  const { submissions, session } = useAppState();
  return submissions.find((s) => s.id === session?.submissionId) ?? null;
}

/**
 * Staf Procurement dan Staf Procurement Admin memiliki wewenang yang sama.
 * Pembedaan sebelumnya dihapus atas permintaan tim procurement, sehingga
 * kedua role dapat memilih jalur registrasi internal maupun mengisi profil.
 */
export function canUseInternalPath(user) {
  return user?.role === ROLE.STAFF || user?.role === ROLE.ADMIN;
}

export function isManager(user) {
  return user?.role === ROLE.MANAGER;
}
