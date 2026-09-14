import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import DataList from '../../components/ui/DataList.jsx';
import ProfileSummary from '../../components/profile/ProfileSummary.jsx';
import { Checkbox, TextAreaField } from '../../components/ui/Field.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { PATH, STATUS } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Verifikasi dokumen — gerbang terakhir sebelum pemasok berstatus aktif.
 * Staf menandai dokumen yang bermasalah satu per satu, sehingga pemasok
 * tahu persis berkas mana yang harus diperbaiki.
 */
const CHECKABLE_DOCUMENTS = [
  { id: 'ktp', label: 'Scan KTP' },
  { id: 'npwp', label: 'Scan NPWP' },
  { id: 'siup', label: 'SIUP' },
  { id: 'pkp', label: 'PKP' },
  { id: 'sbu', label: 'SBU' },
  { id: 'skb', label: 'SKB' },
  { id: 'suratKeteranganPp', label: 'Surat Keterangan PP' },
  { id: 'codCor', label: 'COD/COR' },
  { id: 'tin', label: 'Dokumen TIN' },
  { id: 'brn', label: 'Dokumen BRN' },
  { id: 'aktaPendirian', label: 'Akta Pendirian' },
  { id: 'skPendirian', label: 'SK Pendirian MENKUMHAM' },
  { id: 'aktaPerubahan', label: 'Akta Perubahan SK/SP' },
  { id: 'aktaSusunanDireksi', label: 'Akta Susunan Direksi' },
  { id: 'nib', label: 'NIB' },
  { id: 'suratIzinUsaha', label: 'Surat Izin Usaha / Sertifikat Standar' },
  { id: 'izinLokasi', label: 'Izin Lokasi' },
  { id: 'pkkpr', label: 'PKKPR' },
  { id: 'suratKuasa', label: 'Surat Kuasa' },
  { id: 'conflictOfInterest', label: 'Conflict of Interest' },
  { id: 'businessLicense', label: 'Business License' },
  { id: 'deedOfEstablishment', label: 'Deed of Establishment' },
  { id: 'sertifikat', label: 'Lisensi & sertifikat' },
  { id: 'bank', label: 'Data rekening bank' },
];

export default function DocumentVerification() {
  const t = useT();
  const { submissions, session } = useAppState();
  const actions = useAppActions();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState(null);
  const [flagged, setFlagged] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);

  const queue = submissions.filter((s) => s.status === STATUS.REGISTRATION);
  const selected = queue.find((s) => s.id === selectedId) ?? queue[0] ?? null;

  function toggleFlag(docId, checked) {
    setFlagged((current) => {
      const next = { ...current };
      if (checked) next[docId] = next[docId] ?? '';
      else delete next[docId];
      return next;
    });
  }

  function handleApprove() {
    actions.verifyDocuments(selected.id, session.user);
    setApproving(false);
    setFlagged({});
    toast.success(`${selected.general.vendorName} kini berstatus aktif.`);
  }

  function handleRequestFix(event) {
    event.preventDefault();
    const notes = Object.entries(flagged)
      .filter(([, reason]) => reason.trim())
      .map(([docId, reason]) => ({
        document: CHECKABLE_DOCUMENTS.find((d) => d.id === docId).label,
        reason: reason.trim(),
      }));

    if (notes.length === 0) return;

    actions.requestDocumentFix(selected.id, notes, session.user);
    setRejecting(false);
    setFlagged({});
    toast.notify('Permintaan perbaikan dikirim ke pemasok.');
  }

  if (queue.length === 0) {
    return (
      <>
      <PageHeader
        trail={[{ label: t('common.home'), to: '/internal/beranda' }, { label: t('nav.verification') }]}
        icon="verify"
        title={t('verify.title')}
        description="Periksa keterbacaan berkas, kesesuaian nomor identitas, masa berlaku sertifikat, dan kecocokan nama pemilik rekening dengan badan usaha."
      />
        <div className="card">
          <EmptyState
            title="Tidak ada dokumen yang menunggu"
            description="Pengajuan muncul di sini setelah pemasok melengkapi profil dan menyetujui syarat dan ketentuan."
            action={<Button variant="secondary" to="/internal/antrian">Buka antrian registrasi</Button>}
          />
        </div>
      </>
    );
  }

  const flaggedCount = Object.keys(flagged).length;
  const hasEmptyReason = Object.values(flagged).some((reason) => !reason.trim());
  const preparedByStaff = selected.onboardingPath === PATH.INTERNAL;

  return (
    <>
      <PageHeader
        trail={[{ label: t('common.home'), to: '/internal/beranda' }, { label: t('nav.verification') }]}
        icon="verify"
        title={t('verify.title')}
        description="Periksa keterbacaan berkas, kesesuaian nomor identitas, masa berlaku sertifikat, dan kecocokan nama pemilik rekening dengan badan usaha."
      />

      <div className="queue-layout">
        <aside className="queue-panel" aria-label="Menunggu verifikasi">
          <p className="text-xs muted" style={{ marginBottom: 'var(--sp-3)' }}>
            {queue.length} pengajuan menunggu
          </p>
          <ul className="queue-list">
            {queue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="queue-item"
                  aria-current={selected?.id === item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setFlagged({});
                  }}
                >
                  <span className="queue-item__name">{item.general.vendorName}</span>
                  <span className="queue-item__meta">
                    {item.verification?.triggeredBySection
                      ? 'Perubahan data pemasok aktif'
                      : `Disetujui pemasok ${formatDate(item.consent?.gtcAcceptedAt)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="stack-lg">
          <Card title={selected.general.vendorName} subtitle={selected.id}>
            <DataList
              items={[
                { label: 'Jalur onboarding', value: preparedByStaff ? 'Registrasi internal' : 'Undangan pemasok' },
                { label: 'Profil diisi oleh', value: preparedByStaff ? selected.internalDraft?.filledBy : 'Pemasok' },
                { label: 'Persetujuan ditandatangani', value: formatDate(selected.consent?.gtcAcceptedAt) },
                { label: 'Ditandatangani oleh', value: selected.consent?.acceptedBy },
              ]}
            />

            {selected.verification?.triggeredBySection && (
              <div className="notice notice--info" style={{ marginTop: 'var(--sp-4)' }}>
                <span className="notice__title">Pemeriksaan ulang atas perubahan data</span>
                Pemasok mengubah bagian {selected.verification.triggeredBySection}. Data lama masih
                berlaku sampai Anda menyetujui perubahan ini.
              </div>
            )}
          </Card>

          <Card title="Dokumen pemasok">
            <ProfileSummary profile={selected.profile} />
          </Card>

          <Card
            title="Hasil pemeriksaan"
            subtitle="Tandai dokumen yang bermasalah, atau setujui bila semuanya sesuai"
          >
            <div className="stack-sm">
              {CHECKABLE_DOCUMENTS.map((doc) => (
                <div key={doc.id}>
                  <Checkbox
                    label={`${doc.label} perlu diperbaiki`}
                    checked={doc.id in flagged}
                    onChange={(checked) => toggleFlag(doc.id, checked)}
                  />
                  {doc.id in flagged && (
                    <div style={{ marginTop: 'var(--sp-2)', marginLeft: 29 }}>
                      <TextAreaField
                        label={`Alasan — ${doc.label}`}
                        rows={2}
                        value={flagged[doc.id]}
                        onChange={(e) =>
                          setFlagged((current) => ({ ...current, [doc.id]: e.target.value }))
                        }
                        placeholder="Sebutkan apa yang harus diperbaiki pemasok."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <Button
                variant="danger"
                disabled={flaggedCount === 0 || hasEmptyReason}
                onClick={() => setRejecting(true)}
              >
                Minta perbaikan{flaggedCount > 0 ? ` (${flaggedCount})` : ''}
              </Button>
              <Button
                variant="success"
                disabled={flaggedCount > 0}
                onClick={() => setApproving(true)}
              >
                Setujui dan aktifkan
              </Button>
            </div>

            {flaggedCount > 0 && hasEmptyReason && (
              <p className="text-xs muted" style={{ textAlign: 'right', marginTop: 'var(--sp-2)' }}>
                Isi alasan untuk setiap dokumen yang ditandai.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={approving}
        onClose={() => setApproving(false)}
        title="Aktifkan pemasok ini?"
        description={`${selected.general.vendorName} akan memperoleh akses penuh ke Supply Collaboration Hub.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproving(false)}>
              Batal
            </Button>
            <Button variant="success" onClick={handleApprove}>
              Aktifkan pemasok
            </Button>
          </>
        }
      />

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Kirim permintaan perbaikan?"
        description="Pemasok menerima daftar dokumen yang perlu diperbaiki beserta alasannya."
      >
        <form onSubmit={handleRequestFix}>
          <ul className="stack-sm" style={{ margin: 0, paddingLeft: '1.1em' }}>
            {Object.entries(flagged).map(([docId, reason]) => (
              <li key={docId} className="text-sm">
                <strong>{CHECKABLE_DOCUMENTS.find((d) => d.id === docId).label}</strong>
                <br />
                <span className="muted">{reason}</span>
              </li>
            ))}
          </ul>
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              Batal
            </Button>
            <Button type="submit" variant="danger">
              Kirim ke pemasok
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
