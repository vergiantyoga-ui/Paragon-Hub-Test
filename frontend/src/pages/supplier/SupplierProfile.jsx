import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionRail from '../../components/ui/SectionRail.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import ProfileSectionForm from '../../components/profile/ProfileSectionForm.jsx';
import ProfileSummary from '../../components/profile/ProfileSummary.jsx';
import { useAppActions, useCurrentSubmission } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
  PROFILE_SECTIONS,
  REGISTRATION_SECTIONS,
  REQUIRED_SECTION_IDS,
  REVERIFY_SECTION_IDS,
  STATUS,
  hasFinishedRegistration,
} from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Satu halaman Profil untuk seluruh data pemasok:
 * tiga bagian yang terisi saat mendaftar, dan lima bagian kelengkapan
 * yang wajib diisi setelah pendaftaran disetujui.
 *
 * Halaman ini melayani dua keadaan sekaligus — melengkapi profil saat
 * onboarding, dan menyunting data setelah pemasok aktif — karena isinya
 * sama dan memisahkannya hanya membuat pemasok berpindah-pindah layar.
 */
export default function SupplierProfile() {
  const t = useT();
  const submission = useCurrentSubmission();
  const { saveProfileSection, updateRegistrationSection, updateActiveProfile } = useAppActions();
  const [active, setActive] = useState(() => firstIncomplete(submission));
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const isActive = hasFinishedRegistration(submission.status);
  const completed = completionMap(submission);
  const doneCount = PROFILE_SECTIONS.filter((s) => completed[s.id]).length;
  const allDone = REQUIRED_SECTION_IDS.every((id) => completed[id]);
  const section = PROFILE_SECTIONS.find((s) => s.id === active);
  const isRegistration = section.group === 'registration';
  const sectionFilled = completed[active];

  const fixNotes =
    submission.status === STATUS.NEEDS_DOCUMENT_FIX ? (submission.verification?.notes ?? []) : [];

  function currentValue(sectionId) {
    return REGISTRATION_SECTIONS.some((s) => s.id === sectionId)
      ? submission[sectionId]
      : submission.profile[sectionId];
  }

  function handleSubmit(values) {
    // Setelah aktif, perubahan dokumen legalitas dan data finansial
    // harus diperiksa ulang sebelum berlaku.
    if (isActive && REVERIFY_SECTION_IDS.includes(active)) {
      setConfirming({ sectionId: active, values });
      return;
    }

    if (isRegistration) {
      updateRegistrationSection(submission.id, active, values, submission.contact.name);
    } else if (isActive) {
      updateActiveProfile(submission.id, active, values, false, submission.contact.name);
    } else {
      saveProfileSection(submission.id, active, values, 'supplier');
    }

    toast.success(`${t(`section.${section.id}`)} — ${t('common.save')}.`);
    setEditing(false);

    // Saat onboarding, langsung antar ke bagian berikutnya yang masih kosong.
    if (!isActive) {
      const next = PROFILE_SECTIONS.find((s) => s.id !== active && !completed[s.id]);
      if (next) {
        setActive(next.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  function confirmReverification() {
    const { sectionId, values } = confirming;
    updateActiveProfile(submission.id, sectionId, values, true, submission.contact.name);
    toast.success('Perubahan dikirim ke tim procurement untuk diperiksa.');
    setConfirming(null);
    setEditing(false);
  }

  const showForm = editing || (!isActive && !sectionFilled);

  return (
    <>
      <PageHeader
        trail={[{ label: t('common.home'), to: '/portal/status' }, { label: t('nav.profile') }]}
        icon="profile"
        title={t('profile.title')}
        description={t(isActive ? 'profile.lede.active' : 'profile.lede.onboarding')}
        actions={<StatusBadge status={submission.status} />}
      />

      {fixNotes.length > 0 && (
        <div className="notice notice--danger" style={{ marginBottom: 'var(--sp-5)' }}>
          <span className="notice__title">Tim procurement meminta perbaikan dokumen</span>
          <ul style={{ margin: '6px 0 0', paddingLeft: '1.1em' }}>
            {fixNotes.map((note) => (
              <li key={note.document}>
                <strong>{note.document}</strong> — {note.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submission.status === STATUS.REGISTRATION && (
        <div className="notice notice--warn" style={{ marginBottom: 'var(--sp-5)' }}>
          <span className="notice__title">Sedang diperiksa tim procurement</span>
          Data lama Anda tetap berlaku sampai pemeriksaan selesai.
        </div>
      )}

      <div className="profile-layout">
        <div className="profile-rail">
          <SectionRail
            sections={PROFILE_SECTIONS}
            active={active}
            completed={completed}
            onSelect={(id) => {
              setActive(id);
              setEditing(false);
            }}
            groups={[
              { id: 'registration', label: t('section.group.registration') },
              { id: 'onboarding', label: t('section.group.onboarding') },
            ]}
          />

          <p
            className="text-xs muted"
            style={{
              marginTop: 'var(--sp-4)',
              paddingTop: 'var(--sp-4)',
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            {t('profile.progress', { done: doneCount, total: PROFILE_SECTIONS.length })}
          </p>

          {!isActive && allDone && (
            <Button
              block
              style={{ marginTop: 'var(--sp-4)' }}
              onClick={() => navigate('/portal/persetujuan')}
            >
              {t('profile.toConsent')}
            </Button>
          )}
        </div>

        <Card
          title={t(`section.${section.id}`)}
          subtitle={
            isRegistration && !editing
              ? t('section.filledAtRegistration')
              : t(`section.${section.id}.hint`)
          }
          actions={
            !showForm && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                {t('common.edit')}
              </Button>
            )
          }
        >
          {showForm ? (
            <ProfileSectionForm
              key={active}
              sectionId={active}
              value={currentValue(active)}
              onSubmit={handleSubmit}
              onCancel={sectionFilled ? () => setEditing(false) : undefined}
              submitLabel={t(sectionFilled ? 'common.saveChanges' : 'common.saveSection')}
            />
          ) : (
            <ProfileSummary
              profile={submission.profile}
              registration={submission}
              sections={[active]}
              showHeadings={false}
            />
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="Kirim perubahan untuk diperiksa?"
        description="Tim procurement akan memeriksa dokumen yang Anda ubah. Sampai pemeriksaan selesai, data lama tetap yang berlaku."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Batal
            </Button>
            <Button onClick={confirmReverification}>Kirim perubahan</Button>
          </>
        }
      />

      {isActive && submission.activatedAt && (
        <p className="text-sm muted" style={{ marginTop: 'var(--sp-5)' }}>
          Aktif sejak {formatDate(submission.activatedAt)}.
        </p>
      )}
    </>
  );
}

/** Bagian pendaftaran selalu terisi; bagian kelengkapan mengikuti catatan profil. */
function completionMap(submission) {
  const map = {};
  REGISTRATION_SECTIONS.forEach((s) => {
    map[s.id] = true;
  });
  REQUIRED_SECTION_IDS.forEach((id) => {
    map[id] = Boolean(submission.profile.completed[id]);
  });
  return map;
}

function firstIncomplete(submission) {
  const missing = REQUIRED_SECTION_IDS.find((id) => !submission.profile.completed[id]);
  return missing ?? PROFILE_SECTIONS[0].id;
}
