import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAppActions, useCurrentSubmission } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { PATH, REQUIRED_SECTION_IDS, STATUS } from '../../lib/constants.js';
import { formatDate, formatDateTime } from '../../lib/format.js';
import { useT } from '../../i18n/LanguageContext.jsx';
import { VENDOR_TYPES, labelOf } from '../../lib/masterData.js';

/**
 * Layar utama pemasok. Isinya berubah mengikuti status pengajuan supaya
 * pemasok selalu melihat satu tindakan berikutnya yang jelas.
 */
export default function SupplierStatus() {
  const t = useT();
  const submission = useCurrentSubmission();
  const { resubmitDocuments } = useAppActions();
  const navigate = useNavigate();
  const toast = useToast();

  const doneCount = REQUIRED_SECTION_IDS.filter((id) => submission.profile.completed[id]).length;
  const preparedByStaff = submission.onboardingPath === PATH.INTERNAL;

  const views = {
    [STATUS.INVITED]: {
      tone: 'info',
      title: 'Saatnya melengkapi profil perusahaan',
      body: 'Kami memerlukan dokumen pajak, legalitas, sertifikat, data rekening, dan kontak tim Anda sebelum akun dapat diaktifkan.',
      action: (
        <Button onClick={() => navigate('/portal/profil')}>Mulai isi profil</Button>
      ),
    },
    [STATUS.CONNECTED]: {
      tone: 'info',
      title: 'Profil Anda sudah disiapkan tim Paragon',
      body: 'Tim procurement mengisikan profil berdasarkan dokumen yang Anda kirim sebelumnya. Mohon tinjau isinya, perbaiki bila ada yang keliru, lalu berikan persetujuan.',
      action: (
        <Button onClick={() => navigate('/portal/profil')}>Tinjau profil</Button>
      ),
    },
    [STATUS.ONBOARDING]: {
      tone: 'info',
      title: `Kelengkapan profil terisi ${doneCount} dari ${REQUIRED_SECTION_IDS.length} bagian`,
      body: preparedByStaff
        ? 'Periksa data yang disiapkan tim Paragon, lalu lanjutkan ke persetujuan.'
        : 'Lanjutkan pengisian bagian yang tersisa. Data yang sudah disimpan tidak akan hilang.',
      action: (
        <Button onClick={() => navigate('/portal/profil')}>Lanjutkan pengisian</Button>
      ),
    },
    [STATUS.REGISTRATION]: {
      tone: 'warn',
      title: 'Dokumen sedang diperiksa tim procurement',
      body: 'Kami memeriksa keterbacaan berkas, kesesuaian nomor identitas, dan masa berlaku sertifikat. Anda akan menerima email begitu pemeriksaan selesai.',
      action: null,
    },
    [STATUS.NEEDS_DOCUMENT_FIX]: {
      tone: 'danger',
      title: 'Ada dokumen yang perlu diperbaiki',
      body: 'Perbaiki berkas yang disebut di bawah, lalu kirim ulang untuk diperiksa kembali.',
      action: (
        <div className="row">
          <Button onClick={() => navigate('/portal/profil')}>Perbaiki dokumen</Button>
          <Button
            variant="secondary"
            onClick={() => {
              resubmitDocuments(submission.id, submission.contact.name);
              toast.success('Dokumen dikirim ulang untuk diperiksa.');
            }}
          >
            Kirim ulang untuk diperiksa
          </Button>
        </div>
      ),
    },
    [STATUS.PREFERRED]: {
      tone: 'success',
      title: 'Akun Anda aktif',
      body: 'Anda kini dapat menerima pesanan pembelian, mengirim tagihan, dan memperbarui data perusahaan kapan pun ada perubahan.',
      action: <Button onClick={() => navigate('/portal/profil')}>Buka profil perusahaan</Button>,
    },
  };

  const view = views[submission.status] ?? {
    tone: 'info',
    title: 'Pendaftaran Anda sedang ditinjau',
    body: 'Tim procurement sedang memeriksa data pendaftaran Anda.',
    action: null,
  };

  return (
    <>
      <PageHeader
        trail={[{ label: t('common.home') }]}
        icon="status"
        title={t('nav.status')}
        description={`${submission.general.vendorName} · ${submission.id}`}
      />

      <div className="stack-lg">
      <div className={`notice notice--${view.tone}`}>
        <span className="notice__title">{view.title}</span>
        {view.body}
      </div>

      {view.action && <div>{view.action}</div>}

      {submission.status === STATUS.NEEDS_DOCUMENT_FIX && (
        <Card title="Catatan pemeriksaan">
          <ul className="stack-sm" style={{ margin: 0, paddingLeft: '1.1em' }}>
            {(submission.verification?.notes ?? []).map((note) => (
              <li key={note.document}>
                <strong>{note.document}</strong>
                <br />
                <span className="text-sm muted">{note.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Ringkasan pendaftaran">
        <dl className="datalist">
          <div>
            <dt>Nomor pengajuan</dt>
            <dd>{submission.id}</dd>
          </div>
          <div>
            <dt>ID akun</dt>
            <dd>{submission.account?.accountId ?? '—'}</dd>
          </div>
          <div>
            <dt>Perusahaan</dt>
            <dd>{submission.general.vendorName}</dd>
          </div>
          <div>
            <dt>Jenis pasokan</dt>
            <dd>{labelOf(VENDOR_TYPES, submission.general.vendorType)}</dd>
          </div>
          <div>
            <dt>Didaftarkan pada</dt>
            <dd>{formatDate(submission.submittedAt)}</dd>
          </div>
          <div>
            <dt>Persetujuan ditandatangani</dt>
            <dd>
              {submission.consent
                ? `${formatDate(submission.consent.gtcAcceptedAt)} oleh ${submission.consent.acceptedBy}`
                : 'Belum'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Riwayat proses">
        <ul className="timeline">
          {[...submission.timeline].reverse().map((item, index) => (
            <li key={`${item.at}-${index}`}>
              <span>{item.label}</span>
              <time dateTime={item.at}>
                {formatDateTime(item.at)} · {item.actor}
              </time>
            </li>
          ))}
        </ul>
      </Card>
      </div>
    </>
  );
}
