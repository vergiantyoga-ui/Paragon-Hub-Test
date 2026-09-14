import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Field.jsx';
import { useAppActions, useCurrentSubmission } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { GTC_CLAUSES, GTC_VERSION, PATH, REQUIRED_SECTION_IDS } from '../../lib/constants.js';

/**
 * Layar persetujuan. Dua kotak centang terpisah:
 * GTC PO dan pernyataan kebenaran data. Redaksi pernyataan kedua
 * menyesuaikan jalur, karena pada jalur internal profil disiapkan staf Paragon.
 */
export default function ConsentPage() {
  const submission = useCurrentSubmission();
  const { acceptConsent } = useAppActions();
  const [gtcAccepted, setGtcAccepted] = useState(false);
  const [accuracyAccepted, setAccuracyAccepted] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const allSectionsDone = REQUIRED_SECTION_IDS.every((id) => submission.profile.completed[id]);
  if (!allSectionsDone) {
    return <Navigate to="/portal/profil" replace />;
  }

  const filledByStaff = submission.onboardingPath === PATH.INTERNAL;
  const bothAccepted = gtcAccepted && accuracyAccepted;

  const accuracyStatement = filledByStaff
    ? 'Saya telah meninjau seluruh data dan dokumen pada profil ini yang disiapkan oleh tim Paragon berdasarkan dokumen yang kami serahkan. Saya menyatakan data tersebut benar, akurat, dan sesuai dokumen aslinya, serta bersedia bertanggung jawab atas kebenarannya.'
    : 'Saya menyatakan seluruh data dan dokumen yang saya isi dan unggah pada profil ini benar, akurat, dan sesuai dokumen aslinya, serta bersedia bertanggung jawab atas kebenarannya.';

  function handleSubmit(event) {
    event.preventDefault();
    if (!bothAccepted) return;
    acceptConsent(
      submission.id,
      submission.contact.name,
      GTC_VERSION,
      submission.onboardingPath ?? PATH.INVITE,
    );
    toast.success('Persetujuan tercatat. Dokumen Anda masuk antrian verifikasi.');
    navigate('/portal/status');
  }

  return (
    <div style={{ maxWidth: 720, marginInline: 'auto' }}>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/portal/status' }, { label: 'Persetujuan' }]}
        icon="consent"
        title="Persetujuan sebelum aktivasi"
        description="Profil Anda sudah lengkap. Bacalah syarat dan ketentuan berikut, lalu setujui kedua pernyataan di bawahnya untuk mengirim profil ke tahap verifikasi."
      />

      <form onSubmit={handleSubmit}>
        <Card
          title="Syarat dan Ketentuan Umum Penyediaan Jasa dan Barang"
          subtitle={`Versi ${GTC_VERSION} · Bahasa Indonesia dan Inggris`}
          actions={
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Unduh salinan
            </Button>
          }
        >
          <div className="consent-doc" tabIndex={0} aria-label="Isi syarat dan ketentuan">
            {GTC_CLAUSES.map((clause) => (
              <article key={clause.number}>
                <span className="consent-doc__ref">{clause.number}</span>
                <h3>{clause.title}</h3>
                <p>{clause.body}</p>
              </article>
            ))}
          </div>

          <p className="text-xs muted" style={{ marginTop: 'var(--sp-3)' }}>
            Ringkasan di atas memuat pasal yang paling berkaitan dengan pendaftaran. Dokumen
            lengkap tersedia pada berkas yang dapat Anda unduh.
          </p>
        </Card>

        <div style={{ marginTop: 'var(--sp-5)' }}>
          <div className={`consent-check ${gtcAccepted ? 'consent-check--checked' : ''}`.trim()}>
            <Checkbox checked={gtcAccepted} onChange={setGtcAccepted}>
              Saya telah membaca dan menyetujui Syarat dan Ketentuan Umum Penyediaan Jasa dan
              Barang, termasuk ketentuan pelindungan data pribadi pada Pasal 14.
            </Checkbox>
          </div>

          <div className={`consent-check ${accuracyAccepted ? 'consent-check--checked' : ''}`.trim()}>
            <Checkbox checked={accuracyAccepted} onChange={setAccuracyAccepted}>
              {accuracyStatement}
            </Checkbox>
          </div>
        </div>

        <div className="form-actions">
          <Button variant="secondary" to="/portal/profil">
            Periksa kembali profil
          </Button>
          <Button type="submit" disabled={!bothAccepted}>
            Setujui dan kirim
          </Button>
        </div>

        {!bothAccepted && (
          <p className="text-xs muted" style={{ textAlign: 'right', marginTop: 'var(--sp-2)' }}>
            Centang kedua pernyataan untuk melanjutkan.
          </p>
        )}
      </form>
    </div>
  );
}
