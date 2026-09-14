import DataList from '../ui/DataList.jsx';
import { formatBytes, formatNpwp } from '../../lib/validation.js';
import { formatDate, orDash } from '../../lib/format.js';
import {
  ENTITY_TYPES,
  LEGAL_STATUSES,
  OTV_STATUSES,
  VENDOR_DIRECT_TYPES,
  VENDOR_TYPES,
  VENDOR_TYPE_DETAILS,
  ACCOUNT_TYPES,
  AGREEMENT_RATE_OPTIONS,
  FISCAL_POSITIONS,
  LEGAL_DOCUMENTS,
  TAX_DOCUMENTS,
  TERMS_OF_PAYMENT,
  findBank,
  TRANSACTION_TYPES,
  eInvoiceFor,
  labelOf,
} from '../../lib/masterData.js';

/**
 * Tampilan read-only profil pemasok.
 * `sections` membatasi bagian yang dirender — dipakai halaman profil aktif
 * yang menampilkan satu bagian per kartu, sementara layar verifikasi dan
 * approval menampilkan kelimanya sekaligus.
 */
const ALL_SECTIONS = [
  'general',
  'address',
  'contact',
  'tax',
  'documents',
  'licenses',
  'banking',
  'contacts',
];

/**
 * `registration` berisi data yang diisi saat mendaftar (general, address, contact);
 * `profile` berisi lima bagian kelengkapan. Keduanya dirender oleh komponen ini
 * supaya halaman Profil menampilkan seluruh data pemasok dalam satu tempat.
 */
export default function ProfileSummary({
  profile,
  registration,
  sections = ALL_SECTIONS,
  showHeadings = true,
}) {
  const show = (id) => sections.includes(id);

  return (
    <div className="stack-lg">
      {show('general') && registration && (
        <Block title="Data umum" visible={showHeadings}>
          <DataList
            items={[
              { label: 'Status badan hukum', value: labelOf(LEGAL_STATUSES, registration.general.legalStatus) },
              { label: 'Bentuk badan usaha', value: labelOf(ENTITY_TYPES, registration.general.entityType) },
              { label: 'Nama perusahaan', value: registration.general.vendorName, full: true },
              { label: 'Jenis pasokan', value: labelOf(VENDOR_TYPES, registration.general.vendorType) },
              { label: 'Rincian pasokan', value: labelOf(VENDOR_TYPE_DETAILS, registration.general.vendorTypeDetail) },
              { label: 'Tipe vendor', value: labelOf(VENDOR_DIRECT_TYPES, registration.general.vendorDirectType) },
              { label: 'Perusahaan dituju', value: registration.general.targetCompanies, full: true },
              { label: 'Rencana kerja sama', value: labelOf(OTV_STATUSES, registration.general.otvStatus) },
              { label: 'Email perusahaan', value: registration.general.companyEmail },
              { label: 'Telepon kantor', value: registration.general.officePhone },
              { label: 'Nomor ponsel', value: registration.general.mobilePhone },
              { label: 'Situs web', value: registration.general.website, full: true },
            ]}
          />
        </Block>
      )}

      {show('address') && registration && (
        <Block title="Alamat perusahaan" visible={showHeadings}>
          <DataList
            items={[
              { label: 'Alamat lengkap', value: registration.address.street, full: true },
              { label: 'Negara', value: registration.address.country },
              { label: 'Provinsi', value: registration.address.province },
              { label: 'Kota', value: registration.address.city },
              { label: 'Kode pos', value: registration.address.postalCode },
              { label: 'Kecamatan', value: registration.address.district },
              { label: 'Kelurahan', value: registration.address.subdistrict },
            ]}
          />
        </Block>
      )}

      {show('contact') && registration && (
        <Block title="Penanggung jawab" visible={showHeadings}>
          <DataList
            items={[
              {
                label: 'Nama',
                value: `${registration.contact.title} ${registration.contact.name}`.trim(),
              },
              { label: 'Bidang pekerjaan', value: registration.contact.jobPosition },
              { label: 'Email', value: registration.contact.email },
              { label: 'Telepon kantor', value: registration.contact.phone },
              { label: 'Nomor ponsel', value: registration.contact.mobile },
              { label: 'Catatan', value: registration.contact.notes, full: true },
            ]}
          />
        </Block>
      )}

      {show('tax') && profile && (
        <Block title="Data pajak" visible={showHeadings}>
          <DataList
            items={[
              { label: 'Tax name', value: profile.tax.taxName, full: true },
              { label: 'Tax address', value: profile.tax.taxAddress, full: true },
              { label: 'NIK', value: profile.tax.nik },
              { label: 'NPWP', value: profile.tax.npwp ? formatNpwp(profile.tax.npwp) : null },
              {
                label: 'Transaction type',
                value: labelOf(TRANSACTION_TYPES, profile.tax.transactionType),
              },
              { label: 'E-invoice provided', value: eInvoiceFor(profile.tax.transactionType) },
              { label: 'TIN', value: profile.tax.tin },
              { label: 'BRN', value: profile.tax.brn },
              { label: 'Nomor GST', value: profile.tax.gstNumber, full: true },
            ]}
          />

          <FileRow label="Scan KTP" file={profile.tax.ktpDocument} />
          <FileRow label="Scan NPWP" file={profile.tax.npwpDocument} />
          <FileRow label="Dokumen TIN" file={profile.tax.tinDocument} />
          <FileRow label="Dokumen BRN" file={profile.tax.brnDocument} />

          <div style={{ marginTop: 'var(--sp-4)' }}>
            {TAX_DOCUMENTS.map(({ key, label }) => {
              const doc = profile.tax.documents?.[key];
              if (!doc?.number && !doc?.file) {
                return (
                  <p key={key} className="text-sm muted" style={{ marginBottom: 'var(--sp-2)' }}>
                    {label} — tidak diisi
                  </p>
                );
              }

              return (
                <div key={key} style={{ marginBottom: 'var(--sp-4)' }}>
                  <DataList
                    items={[
                      { label: `${label} — nomor`, value: doc.number },
                      {
                        label: 'Masa berlaku',
                        value: `${formatDate(doc.validFrom)} sampai ${formatDate(doc.validUntil)}`,
                      },
                    ]}
                  />
                  <FileRow label={`Berkas ${label}`} file={doc.file} />
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {show('documents') && profile && (
        <Block title="Dokumen legalitas" visible={showHeadings}>
          {LEGAL_DOCUMENTS.map(({ key, label, required }) => {
            const file = profile.documents?.[key];
            if (!file && !required) {
              return (
                <p key={key} className="text-sm muted" style={{ marginTop: 'var(--sp-2)' }}>
                  {label} — tidak dilampirkan
                </p>
              );
            }
            return <FileRow key={key} label={label} file={file} />;
          })}

          {profile.documents?.reasonNoDoe && (
            <p className="text-sm" style={{ marginTop: 'var(--sp-3)' }}>
              <span className="muted">Alasan tanpa DoE: </span>
              {profile.documents.reasonNoDoe}
            </p>
          )}
        </Block>
      )}

      {show('licenses') && profile && (
        <Block title="Lisensi & sertifikat" visible={showHeadings}>
          {['gmp', 'cpkb', 'halal'].map((key) => {
            const cert = profile.licenses[key];
            const label = key === 'halal' ? 'Sertifikat halal' : key.toUpperCase();

            if (cert.notApplicable) {
              return (
                <p key={key} className="text-sm muted" style={{ marginBottom: 'var(--sp-2)' }}>
                  {label} — ditandai tidak berlaku
                </p>
              );
            }

            return (
              <div key={key} style={{ marginBottom: 'var(--sp-4)' }}>
                <DataList
                  items={[
                    { label: `${label} — nomor`, value: cert.number },
                    { label: 'Berlaku sampai', value: formatDate(cert.expiryDate) },
                  ]}
                />
                <FileRow label={`Salinan ${label}`} file={cert.file} />
              </div>
            );
          })}
        </Block>
      )}

      {show('banking') && profile && (
        <Block title="Pembayaran & tagihan" visible={showHeadings}>
          <DataList
            items={[
              { label: 'Mata uang', value: profile.banking.currency },
              {
                label: 'Set agreement rate',
                value: labelOf(AGREEMENT_RATE_OPTIONS, profile.banking.setAgreementRate),
              },
              {
                label: 'Termin pembayaran 1',
                value: labelOf(TERMS_OF_PAYMENT, profile.banking.termsOfPayment1),
              },
              {
                label: 'Termin pembayaran 2',
                value: labelOf(TERMS_OF_PAYMENT, profile.banking.termsOfPayment2),
              },
              {
                label: 'Termin pembayaran 3',
                value: labelOf(TERMS_OF_PAYMENT, profile.banking.termsOfPayment3),
              },
              {
                label: 'Fiscal position',
                value: labelOf(FISCAL_POSITIONS, profile.banking.fiscalPosition),
              },
            ]}
          />

          {(profile.banking.lines ?? []).map((line, index) => {
            const bank = findBank(line.bankCode);
            return (
              <div key={line.id} style={{ marginTop: 'var(--sp-4)' }}>
                <p className="text-sm" style={{ fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
                  Rekening {index + 1}
                </p>
                <DataList
                  items={[
                    { label: 'Account type', value: labelOf(ACCOUNT_TYPES, line.accountType) },
                    { label: 'Bank', value: bank?.name },
                    { label: 'Bank identifier code', value: bank?.bic },
                    { label: 'Bank country', value: bank?.country },
                    { label: 'Nomor rekening', value: line.accountNumber },
                    { label: 'Pemilik rekening', value: line.accountHolder },
                  ]}
                />
                <FileRow label="Bank account statement" file={line.statement} />
              </div>
            );
          })}
        </Block>
      )}

      {show('contacts') && profile && (
        <Block title={`Kontak perusahaan (${profile.contacts.length})`} visible={showHeadings}>
          {profile.contacts.length === 0 ? (
            <p className="text-sm muted">Belum ada kontak yang diisi.</p>
          ) : (
            profile.contacts.map((contact) => (
              <div key={contact.id} style={{ marginBottom: 'var(--sp-4)' }}>
                <p className="text-sm" style={{ fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
                  {contact.title} {contact.name}
                  {contact.isPrimary && (
                    <span className="pill pill--success" style={{ marginLeft: 8 }}>
                      Kontak utama
                    </span>
                  )}
                </p>
                <DataList
                  items={[
                    { label: 'Bidang', value: contact.jobPosition },
                    { label: 'Email', value: contact.email },
                    { label: 'Telepon kantor', value: contact.phone },
                    { label: 'Ponsel', value: contact.mobile },
                    { label: 'Catatan', value: contact.notes, full: true },
                  ]}
                />
              </div>
            ))
          )}
        </Block>
      )}
    </div>
  );
}

function Block({ title, visible, children }) {
  return (
    <section>
      {visible && (
        <h3
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: 'var(--ink-600)',
            marginBottom: 'var(--sp-3)',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function FileRow({ label, file }) {
  return (
    <p className="text-sm" style={{ marginTop: 'var(--sp-2)' }}>
      <span className="muted">{label}: </span>
      {file ? (
        <>
          {file.name} <span className="muted">({formatBytes(file.size)})</span>
        </>
      ) : (
        orDash(null)
      )}
    </p>
  );
}
