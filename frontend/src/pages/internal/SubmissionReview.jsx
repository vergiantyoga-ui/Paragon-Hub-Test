import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs, { TabPanel } from '../../components/ui/Tabs.jsx';
import DataList from '../../components/ui/DataList.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { TextAreaField, SelectField } from '../../components/ui/Field.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { STATUS } from '../../lib/constants.js';
import {
  CORPORATE_ENTITIES,
  ENTITY_TYPES,
  LEGAL_STATUSES,
  OTV_STATUSES,
  VENDOR_DIRECT_TYPES,
  VENDOR_TYPES,
  VENDOR_TYPE_DETAILS,
  corporateCodesFor,
  labelOf,
  labelWithCode,
} from '../../lib/masterData.js';
import { useT } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatDateTime, passwordExpiryFrom } from '../../lib/format.js';

const TABS = [
  { id: 'general', label: 'Data umum' },
  { id: 'address', label: 'Alamat' },
  { id: 'contact', label: 'Kontak' },
];

/**
 * Detail satu pengajuan. Tombol keputusan baru aktif setelah staf membuka
 * ketiga tab, sesuai aturan pada dokumen flow — supaya keputusan tidak
 * diambil tanpa melihat seluruh data.
 */
export default function SubmissionReview({ submission }) {
  const t = useT();
  const { session } = useAppState();
  const actions = useAppActions();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('general');
  const [visited, setVisited] = useState(['general']);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState(null);
  const [choosingInternal, setChoosingInternal] = useState(false);
  const [documentSource, setDocumentSource] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

  const user = session.user;
  const allVisited = TABS.every((t) => visited.includes(t.id));

  function selectTab(id) {
    setTab(id);
    setVisited((current) => (current.includes(id) ? current : [...current, id]));
  }

  function handleApprove() {
    actions.approveSubmission(submission.id, user);
    toast.success('Pendaftaran disetujui. Pilih cara melanjutkan onboarding.');
  }

  function handleReject(event) {
    event.preventDefault();
    if (rejectReason.trim().length < 15) {
      setRejectError('Tuliskan alasan yang cukup jelas agar pemasok tahu apa yang harus diperbaiki.');
      return;
    }
    actions.rejectSubmission(submission.id, rejectReason.trim(), user);
    setRejecting(false);
    setRejectReason('');
    setRejectError(null);
    toast.notify('Pendaftaran ditolak. Catatan dikirim ke pemasok.');
  }

  function handleInvite() {
    const account = actions.inviteSupplier(submission.id, user);
    setInviteResult(account);
    toast.success(`Undangan dikirim ke ${submission.contact.email}.`);
  }

  function handleStartInternal(event) {
    event.preventDefault();
    if (!documentSource) return;
    actions.startInternalRegistration(submission.id, documentSource, user);
    setChoosingInternal(false);
    navigate(`/internal/registrasi/${submission.id}`);
  }

  return (
    <div className="card">
      <div className="card__body">
        <div className="row row--between" style={{ alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>{submission.general.vendorName}</h2>
            <p className="text-sm muted">
              {submission.id} · {labelOf(LEGAL_STATUSES, submission.general.legalStatus)}
              {submission.general.entityType &&
                ` (${labelOf(ENTITY_TYPES, submission.general.entityType)})`}
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <p className="text-xs muted" style={{ marginBottom: 'var(--sp-5)' }}>
          Didaftarkan {formatDate(submission.submittedAt)}
        </p>

        <Tabs items={TABS} active={tab} onChange={selectTab} visited={visited} />

        <TabPanel id="general" active={tab}>
          <DataList
            items={[
              { label: 'Status badan hukum', value: labelWithCode(LEGAL_STATUSES, submission.general.legalStatus) },
              { label: 'Bentuk badan usaha', value: labelWithCode(ENTITY_TYPES, submission.general.entityType) },
              { label: 'Jenis pasokan', value: labelWithCode(VENDOR_TYPES, submission.general.vendorType) },
              { label: 'Rincian pasokan', value: labelWithCode(VENDOR_TYPE_DETAILS, submission.general.vendorTypeDetail) },
              { label: 'Tipe vendor', value: labelWithCode(VENDOR_DIRECT_TYPES, submission.general.vendorDirectType) },
              { label: 'Perusahaan dituju', value: submission.general.targetCompanies, full: true },
              {
                label: 'Kode korporat untuk SAP',
                value: corporateCodesFor(submission.general.targetCompanies).join(', '),
                full: true,
              },
              { label: 'Rencana kerja sama', value: labelWithCode(OTV_STATUSES, submission.general.otvStatus) },
              { label: 'Email perusahaan', value: submission.general.companyEmail },
              { label: 'Telepon kantor', value: submission.general.officePhone },
              { label: 'Nomor ponsel', value: submission.general.mobilePhone },
              { label: 'Situs web', value: submission.general.website, full: true },
            ]}
          />
        </TabPanel>

        <TabPanel id="address" active={tab}>
          <DataList
            items={[
              { label: 'Alamat lengkap', value: submission.address.street, full: true },
              { label: 'Negara', value: submission.address.country },
              { label: 'Provinsi', value: submission.address.province },
              { label: 'Kota', value: submission.address.city },
              { label: 'Kode pos', value: submission.address.postalCode },
              { label: 'Kecamatan', value: submission.address.district },
              { label: 'Kelurahan', value: submission.address.subdistrict },
            ]}
          />
        </TabPanel>

        <TabPanel id="contact" active={tab}>
          <DataList
            items={[
              { label: 'Nama', value: `${submission.contact.title} ${submission.contact.name}` },
              { label: 'Bidang pekerjaan', value: submission.contact.jobPosition },
              { label: 'Email', value: submission.contact.email },
              { label: 'Telepon kantor', value: submission.contact.phone },
              { label: 'Nomor ponsel', value: submission.contact.mobile },
              { label: 'Catatan', value: submission.contact.notes, full: true },
            ]}
          />
          <p className="text-xs muted" style={{ marginTop: 'var(--sp-4)' }}>
            Undangan portal dikirim ke alamat email pada bagian ini.
          </p>
        </TabPanel>

        <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)', margin: 'var(--sp-5) 0' }} />

        {/* --- Keputusan atas pengajuan baru --- */}
        {submission.status === STATUS.SUPPLIER_REQUEST && (
          <>
            {!allVisited && (
              <p className="text-sm muted" style={{ marginBottom: 'var(--sp-3)' }}>
                Buka ketiga tab di atas sebelum mengambil keputusan.
              </p>
            )}
            <div className="row">
              <Button variant="success" disabled={!allVisited} onClick={handleApprove}>
                Setujui pendaftaran
              </Button>
              <Button variant="danger" disabled={!allVisited} onClick={() => setRejecting(true)}>
                Tolak pendaftaran
              </Button>
            </div>
          </>
        )}

        {/* --- Pemilihan jalur onboarding --- */}
        {submission.status === STATUS.APPROVED && (
          <section>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', marginBottom: 'var(--sp-2)' }}>
              Pilih cara melanjutkan
            </h3>
            <p className="text-sm muted" style={{ marginBottom: 'var(--sp-4)' }}>
              Pilihan ini tidak dapat diubah setelah ditetapkan.
            </p>

            <div className="path-grid">
              <div className="path-card">
                <h3>Undang pemasok</h3>
                <p>
                  Pemasok menerima ID akun dan kata sandi sementara hari ini juga, lalu mengisi
                  profilnya sendiri.
                </p>
                <Button onClick={handleInvite}>Kirim undangan</Button>
              </div>

              <div className="path-card">
                <h3>Isi profil secara internal</h3>
                <p>
                  Untuk pemasok yang menyerahkan dokumen lewat email atau WhatsApp. Profil diisi
                  staf procurement, lalu akun langsung dikirim ke pemasok.
                </p>
                <Button variant="secondary" onClick={() => setChoosingInternal(true)}>
                  Mulai registrasi internal
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* --- Status pasca keputusan --- */}
        {submission.status === STATUS.REJECTED && (
          <div className="notice notice--danger">
            <span className="notice__title">Ditolak pada {formatDate(submission.decidedAt)}</span>
            {submission.rejectReason}
          </div>
        )}

        {submission.status === STATUS.INTERNAL_DRAFT && (
          <div className="stack">
            <div className="notice notice--info">
              <span className="notice__title">Registrasi internal sedang berjalan</span>
              Dokumen diterima melalui {submission.documentSource === 'whatsapp' ? 'WhatsApp' : 'email'}.
            </div>
            <div>
              <Button to={`/internal/registrasi/${submission.id}`}>Lanjutkan pengisian</Button>
            </div>
          </div>
        )}

        {[STATUS.INVITED, STATUS.CONNECTED, STATUS.ONBOARDING].includes(submission.status) && (
          <AccountPanel submission={submission} onResend={() => {
            actions.resendInvite(submission.id, user);
            toast.success('Undangan dikirim ulang. Masa berlaku kata sandi dihitung ulang.');
          }} />
        )}

        {submission.status === STATUS.REGISTRATION && (
          <div className="notice notice--warn">
            <span className="notice__title">Dokumen menunggu diperiksa</span>
            Buka menu verifikasi dokumen untuk menyelesaikan pemeriksaan.
          </div>
        )}

        {submission.status === STATUS.PREFERRED && (
          <div className="notice notice--success">
            <span className="notice__title">Preferred supplier</span>
            Ditetapkan {formatDate(submission.preferredDecision?.decidedAt)} oleh{' '}
            {submission.preferredDecision?.decidedBy}. ID akun {submission.account?.accountId}.
          </div>
        )}

        {submission.status === STATUS.DISQUALIFIED && (
          <div className="notice notice--danger">
            <span className="notice__title">Didiskualifikasi</span>
            {submission.preferredDecision?.note}
          </div>
        )}

        {/* --- Riwayat --- */}
        <section style={{ marginTop: 'var(--sp-6)' }}>
          <h3
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--ink-600)',
              marginBottom: 'var(--sp-3)',
            }}
          >
            Riwayat proses
          </h3>
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
        </section>
      </div>

      {/* --- Dialog penolakan --- */}
      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Tolak pendaftaran"
        description="Catatan ini dikirim ke pemasok, jadi sebutkan dengan jelas apa yang perlu diperbaiki."
      >
        <form onSubmit={handleReject}>
          <TextAreaField
            label="Alasan penolakan"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            error={rejectError}
            placeholder="Contoh: Nama pada dokumen NPWP berbeda dengan nama badan usaha yang didaftarkan."
            required
          />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              Batal
            </Button>
            <Button type="submit" variant="danger">
              Kirim penolakan
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Dialog pemilihan jalur internal --- */}
      <Modal
        open={choosingInternal}
        onClose={() => setChoosingInternal(false)}
        title="Mulai registrasi internal"
        description="Setelah dipilih, pengajuan ini tidak bisa dialihkan ke jalur undangan."
      >
        <form onSubmit={handleStartInternal}>
          <SelectField
            label="Dokumen diterima melalui"
            options={[
              { value: 'email', label: 'Email' },
              { value: 'whatsapp', label: 'WhatsApp' },
            ]}
            value={documentSource}
            onChange={(e) => setDocumentSource(e.target.value)}
            hint="Dicatat sebagai jejak asal dokumen di luar sistem."
            required
          />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setChoosingInternal(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!documentSource}>
              Mulai mengisi
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Kredensial hasil undangan --- */}
      <Modal
        open={Boolean(inviteResult)}
        onClose={() => setInviteResult(null)}
        title="Undangan terkirim"
        description={`Email berisi tautan portal dan kredensial sudah dikirim ke ${submission.contact.email}.`}
        footer={<Button onClick={() => setInviteResult(null)}>Selesai</Button>}
      >
        {inviteResult && (
          <DataList
            items={[
              { label: 'ID akun', value: inviteResult.accountId },
              { label: 'Kata sandi sementara', value: inviteResult.temporaryPassword },
              {
                label: 'Berlaku sampai',
                value: formatDate(passwordExpiryFrom(inviteResult.emailSentAt)),
                full: true,
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}

function AccountPanel({ submission, onResend }) {
  const expiry = submission.account ? passwordExpiryFrom(submission.account.emailSentAt) : null;

  return (
    <div className="stack">
      <DataList
        items={[
          { label: 'ID akun', value: submission.account?.accountId },
          { label: 'Undangan dikirim', value: formatDate(submission.account?.emailSentAt) },
          {
            label: 'Kata sandi sementara',
            value: submission.account?.passwordChanged ? 'Sudah diganti pemasok' : 'Belum dipakai',
          },
          { label: 'Berlaku sampai', value: formatDate(expiry) },
        ]}
      />
      {!submission.account?.passwordChanged && (
        <div>
          <Button variant="secondary" size="sm" onClick={onResend}>
            Kirim ulang undangan
          </Button>
        </div>
      )}
    </div>
  );
}
