import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import SectionRail from '../../components/ui/SectionRail.jsx';
import ProfileSectionForm from '../../components/profile/ProfileSectionForm.jsx';
import ProfileSummary from '../../components/profile/ProfileSummary.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
  PROFILE_SECTIONS,
  REGISTRATION_SECTIONS,
  REQUIRED_SECTION_IDS,
  STATUS,
} from '../../lib/constants.js';

/**
 * Jalur B — admin procurement mengisi profil atas nama pemasok.
 * Formulirnya sama persis dengan yang dipakai pemasok, karena aturan
 * field dan validasinya identik untuk kedua jalur.
 */
export default function InternalRegistration() {
  const { id } = useParams();
  const { submissions, session } = useAppState();
  const { saveProfileSection, finishInternalRegistration } = useAppActions();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const submission = submissions.find((s) => s.id === id);
  const [active, setActive] = useState(
    submission ? firstIncomplete(submission.profile.completed) : 'tax',
  );

  if (!submission) return <Navigate to="/internal/antrian" replace />;
  if (submission.status !== STATUS.INTERNAL_DRAFT) {
    return <Navigate to="/internal/antrian" replace />;
  }

  // Bagian pendaftaran sudah terisi sejak pemasok mendaftar dan hanya dibaca di sini.
  const completed = { ...submission.profile.completed };
  REGISTRATION_SECTIONS.forEach((s) => {
    completed[s.id] = true;
  });
  const doneCount = PROFILE_SECTIONS.filter((s) => completed[s.id]).length;
  const allDone = REQUIRED_SECTION_IDS.every((id) => submission.profile.completed[id]);
  const section = PROFILE_SECTIONS.find((s) => s.id === active);
  const isRegistration = section.group === 'registration';

  function handleSave(values) {
    saveProfileSection(submission.id, active, values, 'staff');
    toast.success(`${section.label} tersimpan.`);
    const next = PROFILE_SECTIONS.find((s) => s.id !== active && !completed[s.id]);
    if (next) {
      setActive(next.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleFinish() {
    finishInternalRegistration(submission.id, session.user);
    setConfirming(false);
    toast.success('Registrasi internal selesai. Undangan portal dikirim ke pemasok.');
    navigate('/internal/antrian');
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Antrian registrasi', to: '/internal/antrian' },
          { label: submission.general.vendorName },
        ]}
        icon="document"
        title="Registrasi internal"
        description={`Isi profil berdasarkan dokumen yang dikirim pemasok melalui ${
          submission.documentSource === 'whatsapp' ? 'WhatsApp' : 'email'
        }. Setelah lengkap, akun pemasok langsung dibuat dan undangannya dikirim.`}
      />

      <div className="notice notice--info" style={{ marginBottom: 'var(--sp-5)' }}>
        Pemasok akan meninjau dan menyetujui data ini setelah akun dikirim, jadi pastikan setiap
        angka disalin persis dari dokumen aslinya.
      </div>

      <div className="profile-layout">
        <div className="profile-rail">
          <SectionRail
            sections={PROFILE_SECTIONS}
            active={active}
            completed={completed}
            onSelect={setActive}
            groups={[
              { id: 'registration', label: 'Data pendaftaran' },
              { id: 'onboarding', label: 'Kelengkapan profil' },
            ]}
          />

          <div
            className="text-xs muted"
            style={{
              marginTop: 'var(--sp-4)',
              paddingTop: 'var(--sp-4)',
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            {doneCount} dari {PROFILE_SECTIONS.length} bagian lengkap
          </div>

          <Button
            block
            style={{ marginTop: 'var(--sp-4)' }}
            disabled={!allDone}
            onClick={() => setConfirming(true)}
          >
            Selesai dan kirim akun
          </Button>
          {!allDone && (
            <p className="text-xs muted" style={{ marginTop: 'var(--sp-2)' }}>
              Lengkapi seluruh bagian sebelum mengirim akun.
            </p>
          )}
        </div>

        <Card
          title={section.label}
          subtitle={isRegistration ? 'Terisi saat pemasok mendaftar' : section.hint}
        >
          {isRegistration ? (
            <ProfileSummary
              profile={submission.profile}
              registration={submission}
              sections={[active]}
              showHeadings={false}
            />
          ) : (
            <ProfileSectionForm
              key={active}
              sectionId={active}
              value={submission.profile[active]}
              onSubmit={handleSave}
            />
          )}
        </Card>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Selesaikan registrasi internal?"
        description="Akun pemasok akan dibuat dan undangan portal dikirim ke email kontaknya. Pemasok kemudian meninjau profil ini dan memberikan persetujuan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Batal
            </Button>
            <Button onClick={handleFinish}>Kirim akun sekarang</Button>
          </>
        }
      />
    </>
  );
}

function firstIncomplete(completed) {
  return REQUIRED_SECTION_IDS.find((id) => !completed[id]) ?? REQUIRED_SECTION_IDS[0];
}
