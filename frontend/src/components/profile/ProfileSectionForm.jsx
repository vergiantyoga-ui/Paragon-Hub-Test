import { useState } from 'react';
import {
  TextField,
  SelectField,
  TextAreaField,
  Checkbox,
  CheckboxGroup,
} from '../ui/Field.jsx';
import FileField from '../ui/FileField.jsx';
import Button from '../ui/Button.jsx';
import {
  CONTACT_TITLES,
  COUNTRIES,
  CURRENCIES,
  ENTITY_TYPES,
  JOB_POSITIONS,
  LEGAL_STATUSES,
  LEGAL_STATUS_ENTITY,
  MAX_CONTACTS,
  OTV_STATUSES,
  TARGET_COMPANIES,
  TERMS_OF_PAYMENT,
  ACCOUNT_TYPES,
  AGREEMENT_RATE_OPTIONS,
  BANKS,
  FISCAL_POSITIONS,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_GROUPS,
  TAX_DOCUMENTS,
  TRANSACTION_TYPES,
  VENDOR_DIRECT_TYPES,
  VENDOR_TYPES,
  asOptions,
  detailsForVendorType,
  eInvoiceFor,
  findBank,
  legalDocumentsOf,
  makeBankLine,
  makeTaxDocument,
} from '../../lib/constants.js';
import { formatNpwp, wasNpwpNormalized } from '../../lib/validation.js';
import { LICENSES, normalizeSection, validateSection } from '../../lib/profileRules.js';

/**
 * Satu komponen menangani kelima bagian profil supaya aturan validasi
 * tidak bercabang antara portal pemasok dan konsol internal — dokumen flow
 * menetapkan field yang sama untuk kedua jalur.
 *
 * `onSubmit(values)` dipanggil hanya jika seluruh validasi lolos.
 */
export default function ProfileSectionForm({ sectionId, value, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState(value);
  const [errors, setErrors] = useState({});

  const set = (patch) => setValues((current) => ({ ...current, ...patch }));

  function handleSubmit(event) {
    event.preventDefault();
    const found = validateSection(sectionId, values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Bawa fokus ke field bermasalah pertama agar pengguna keyboard tidak tersesat.
      const firstField = document.querySelector('[aria-invalid="true"]');
      firstField?.focus();
      return;
    }

    onSubmit(normalizeSection(sectionId, values));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {sectionId === 'general' && <GeneralStep values={values} set={set} errors={errors} />}
      {sectionId === 'address' && <AddressStep values={values} set={set} errors={errors} />}
      {sectionId === 'contact' && <ContactStep values={values} set={set} errors={errors} />}
      {sectionId === 'tax' && <TaxSection values={values} set={set} errors={errors} />}
      {sectionId === 'documents' && <DocumentsSection values={values} set={set} errors={errors} />}
      {sectionId === 'licenses' && <LicensesSection values={values} set={set} errors={errors} />}
      {sectionId === 'banking' && <BankingSection values={values} set={set} errors={errors} />}
      {sectionId === 'contacts' && (
        <ContactsSection values={values} setValues={setValues} errors={errors} />
      )}

      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit">{submitLabel ?? 'Simpan bagian ini'}</Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian 1 — Data pajak                                              */
/* ------------------------------------------------------------------ */
function TaxSection({ values, set, errors }) {
  const npwpNormalised = wasNpwpNormalized(values.npwp);
  const documents = values.documents ?? {};

  const setDocument = (key, patch) =>
    set({
      documents: {
        ...documents,
        [key]: { ...(documents[key] ?? makeTaxDocument()), ...patch },
      },
    });

  return (
    <div className="stack-lg">
      {/* --- Identitas pajak --- */}
      <section>
        <h3 className="taxgroup__title">Identitas pajak</h3>

        <div className="field-grid">
          <TextField
            label="Tax name"
            className="span-full"
            value={values.taxName}
            onChange={(e) => set({ taxName: e.target.value })}
            error={errors.taxName}
            hint="Nama wajib pajak sesuai dokumen NPWP."
            required
          />
          <TextAreaField
            label="Tax address"
            className="span-full"
            rows={2}
            value={values.taxAddress}
            onChange={(e) => set({ taxAddress: e.target.value })}
            error={errors.taxAddress}
            hint="Alamat wajib pajak sesuai dokumen NPWP."
            required
          />
          <TextField
            label="Nomor NIK"
            inputMode="numeric"
            maxLength={16}
            value={values.nik}
            onChange={(e) => set({ nik: e.target.value.replace(/\D/g, '') })}
            error={errors.nik}
            hint="16 digit sesuai KTP penanggung jawab."
            required
          />
          <TextField
            label="Nomor NPWP"
            inputMode="numeric"
            maxLength={16}
            value={values.npwp}
            onChange={(e) => set({ npwp: e.target.value.replace(/\D/g, '') })}
            error={errors.npwp}
            hint={
              npwpNormalised
                ? `NPWP 15 digit akan disimpan sebagai ${formatNpwp(values.npwp)}.`
                : '16 digit sesuai format NPWP terbaru.'
            }
            required
          />
          <SelectField
            label="Transaction type"
            options={asOptions(TRANSACTION_TYPES)}
            value={values.transactionType}
            onChange={(e) => set({ transactionType: e.target.value })}
            error={errors.transactionType}
            required
          />
          <div className="field">
            <span className="field__label">E-invoice provided</span>
            <p className="taxgroup__derived">
              {eInvoiceFor(values.transactionType)}
            </p>
            <p className="field__hint">
              Ditentukan otomatis: bernilai Yes bila transaction type adalah Goods.
            </p>
          </div>
        </div>

        <div className="field-grid">
          <FileField
            label="Scan KTP"
            value={values.ktpDocument}
            onChange={(file) => set({ ktpDocument: file })}
            error={errors.ktpDocument}
            required
          />
          <FileField
            label="Scan NPWP"
            value={values.npwpDocument}
            onChange={(file) => set({ npwpDocument: file })}
            error={errors.npwpDocument}
            required
          />
        </div>
      </section>

      {/* --- Dokumen perpajakan berjangka waktu --- */}
      <section>
        <h3 className="taxgroup__title">Dokumen perpajakan</h3>
        <p className="taxgroup__lede">
          Isi nomor, unggah berkasnya, lalu tentukan masa berlakunya. Dokumen selain
          SIUP boleh dikosongkan bila perusahaan Anda tidak memilikinya — namun bila
          sebuah dokumen mulai diisi, seluruh kolomnya harus dilengkapi.
        </p>

        {TAX_DOCUMENTS.map((item) => (
          <TaxDocumentBlock
            key={item.key}
            meta={item}
            value={documents[item.key] ?? makeTaxDocument()}
            errors={errors}
            onChange={(patch) => setDocument(item.key, patch)}
          />
        ))}
      </section>

      {/* --- Identitas pajak luar negeri --- */}
      <section>
        <h3 className="taxgroup__title">Identitas pajak lainnya</h3>

        <div className="field-grid">
          <TextField
            label="TIN"
            value={values.tin}
            onChange={(e) => set({ tin: e.target.value })}
            error={errors.tin}
            hint="Tax Identification Number."
            required
          />
          <FileField
            label="Dokumen TIN"
            value={values.tinDocument}
            onChange={(file) => set({ tinDocument: file })}
            error={errors.tinDocument}
            required
          />
          <TextField
            label="BRN"
            value={values.brn}
            onChange={(e) => set({ brn: e.target.value })}
            error={errors.brn}
            hint="Business Registration Number."
            required
          />
          <FileField
            label="Dokumen BRN"
            value={values.brnDocument}
            onChange={(file) => set({ brnDocument: file })}
            error={errors.brnDocument}
            required
          />
          <TextField
            label="Nomor GST"
            className="span-full"
            value={values.gstNumber}
            onChange={(e) => set({ gstNumber: e.target.value })}
            error={errors.gstNumber}
            required
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Satu dokumen perpajakan: nomor, berkas, dan masa berlakunya.
 * Bentuknya sama untuk keenam dokumen, jadi cukup satu komponen.
 */
function TaxDocumentBlock({ meta, value, errors, onChange }) {
  const prefix = `documents.${meta.key}`;

  return (
    <fieldset className="taxdoc">
      <legend className="taxdoc__legend">
        {meta.label}
        {meta.required ? (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="taxdoc__optional">opsional</span>
        )}
      </legend>

      <div className="field-grid">
        <TextField
          label="Nomor"
          value={value.number}
          onChange={(e) => onChange({ number: e.target.value })}
          error={errors[`${prefix}.number`]}
          required={meta.required}
        />
        <FileField
          label="Berkas"
          value={value.file}
          onChange={(file) => onChange({ file })}
          error={errors[`${prefix}.file`]}
          required={meta.required}
        />
        <TextField
          label="Berlaku mulai"
          type="date"
          value={value.validFrom}
          onChange={(e) => onChange({ validFrom: e.target.value })}
          error={errors[`${prefix}.validFrom`]}
          required={meta.required}
        />
        <TextField
          label="Berlaku sampai"
          type="date"
          value={value.validUntil}
          onChange={(e) => onChange({ validUntil: e.target.value })}
          error={errors[`${prefix}.validUntil`]}
          required={meta.required}
        />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian 2 — Dokumen legalitas                                       */
/* ------------------------------------------------------------------ */
function DocumentsSection({ values, set, errors }) {
  // Alasan hanya diminta bila Deed of Establishment memang tidak dilampirkan.
  // Mewajibkannya tanpa syarat berarti pemasok yang sudah melampirkan DoE tetap
  // harus menjelaskan mengapa tidak melampirkannya.
  const doeMissing = !values.deedOfEstablishment;

  return (
    <div className="stack-lg">
      {LEGAL_DOCUMENT_GROUPS.map((group) => (
        <section key={group.id}>
          <h3 className="taxgroup__title">{group.label}</h3>

          <div className="field-grid">
            {legalDocumentsOf(group.id).map((doc) => (
              <FileField
                key={doc.key}
                label={doc.label}
                value={values[doc.key]}
                onChange={(file) => set({ [doc.key]: file })}
                error={errors[doc.key]}
                required={doc.required}
                hint="PDF, JPG, atau PNG — maks. 2 MB. Nama berkas tanpa karakter tidak lazim."
              />
            ))}
          </div>

          {group.id === 'other' && (
            <TextAreaField
              label="Reason for No DOE attachment"
              rows={3}
              value={values.reasonNoDoe}
              onChange={(e) => set({ reasonNoDoe: e.target.value })}
              error={errors.reasonNoDoe}
              required={doeMissing}
              hint={
                doeMissing
                  ? 'Wajib diisi selama Deed of Establishment belum dilampirkan.'
                  : 'Tidak diperlukan karena Deed of Establishment sudah dilampirkan.'
              }
              disabled={!doeMissing}
            />
          )}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian 3 — Lisensi & sertifikat (kondisional)                      */
/* ------------------------------------------------------------------ */
function LicensesSection({ values, set, errors }) {
  return (
    <div className="stack-lg">
      <p className="text-sm muted">
        Isi sertifikat yang dimiliki perusahaan Anda. Bila sebuah sertifikat tidak berlaku untuk
        jenis barang yang dipasok, tandai sebagai tidak berlaku.
      </p>

      {LICENSES.map(({ key, label, full }) => {
        const cert = values[key];
        const disabled = cert.notApplicable;
        return (
          <fieldset key={key} className="contact-card" style={{ border: '1px solid var(--line-soft)' }}>
            <legend className="visually-hidden">{full}</legend>

            <div className="contact-card__head">
              <span className="contact-card__index">{label}</span>
              <Checkbox
                label="Tidak berlaku untuk kami"
                checked={cert.notApplicable}
                onChange={(checked) =>
                  set({
                    [key]: checked
                      ? { number: '', expiryDate: '', file: null, notApplicable: true }
                      : { ...cert, notApplicable: false },
                  })
                }
              />
            </div>

            {!disabled && (
              <>
                <div className="field-grid">
                  <TextField
                    label="Nomor sertifikat"
                    value={cert.number}
                    onChange={(e) => set({ [key]: { ...cert, number: e.target.value } })}
                    error={errors[`${key}.number`]}
                    required
                  />
                  <TextField
                    label="Berlaku sampai"
                    type="date"
                    value={cert.expiryDate}
                    onChange={(e) => set({ [key]: { ...cert, expiryDate: e.target.value } })}
                    error={errors[`${key}.expiryDate`]}
                    required
                  />
                </div>
                <FileField
                  label="Salinan sertifikat"
                  value={cert.file}
                  onChange={(file) => set({ [key]: { ...cert, file } })}
                  error={errors[`${key}.file`]}
                  required
                />
              </>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian 4 — Pembayaran & tagihan                                    */
/* ------------------------------------------------------------------ */
function BankingSection({ values, set, errors }) {
  const lines = values.lines?.length ? values.lines : [makeBankLine()];

  const updateLine = (id, patch) =>
    set({ lines: lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) });

  const addLine = () => set({ lines: [...lines, makeBankLine()] });

  const removeLine = (id) => {
    const rest = lines.filter((line) => line.id !== id);
    set({ lines: rest.length > 0 ? rest : [makeBankLine()] });
  };

  return (
    <div className="stack-lg">
      {/* --- Tingkat header --- */}
      <section>
        <h3 className="taxgroup__title">Ketentuan umum</h3>

        <div className="field-grid">
          <SelectField
            label="Mata uang transaksi"
            options={CURRENCIES}
            value={values.currency}
            onChange={(e) => set({ currency: e.target.value })}
            error={errors.currency}
            required
          />
          <SelectField
            label="Set agreement rate"
            options={asOptions(AGREEMENT_RATE_OPTIONS)}
            value={values.setAgreementRate}
            onChange={(e) => set({ setAgreementRate: e.target.value })}
            error={errors.setAgreementRate}
            required
          />
          <SelectField
            label="Termin pembayaran 1"
            options={asOptions(TERMS_OF_PAYMENT)}
            value={values.termsOfPayment1}
            onChange={(e) => set({ termsOfPayment1: e.target.value })}
            error={errors.termsOfPayment1}
            hint="Termin utama yang dipakai bila tidak disepakati lain."
            required
          />
          <SelectField
            label="Termin pembayaran 2"
            options={asOptions(TERMS_OF_PAYMENT)}
            value={values.termsOfPayment2}
            onChange={(e) => set({ termsOfPayment2: e.target.value })}
            error={errors.termsOfPayment2}
            hint="Opsional."
          />
          <SelectField
            label="Termin pembayaran 3"
            options={asOptions(TERMS_OF_PAYMENT)}
            value={values.termsOfPayment3}
            onChange={(e) => set({ termsOfPayment3: e.target.value })}
            error={errors.termsOfPayment3}
            hint="Opsional."
          />
          <SelectField
            label="Fiscal position"
            options={asOptions(FISCAL_POSITIONS)}
            value={values.fiscalPosition}
            onChange={(e) => set({ fiscalPosition: e.target.value })}
            error={errors.fiscalPosition}
            hint="Opsional."
          />
        </div>
      </section>

      {/* --- Tingkat baris --- */}
      <section>
        <div className="row row--between" style={{ marginBottom: 'var(--sp-3)' }}>
          <h3 className="taxgroup__title" style={{ marginBottom: 0, border: 0 }}>
            Rekening bank
          </h3>
          <Button variant="secondary" size="sm" onClick={addLine}>
            Tambah rekening
          </Button>
        </div>

        <div className="notice notice--info" style={{ marginBottom: 'var(--sp-4)' }}>
          Nama pemilik rekening harus sama dengan nama badan usaha yang terdaftar. Rekening
          atas nama perorangan akan ditolak saat verifikasi.
        </div>

        {lines.map((line, index) => (
          <BankLineBlock
            key={line.id}
            line={line}
            index={index}
            errors={errors}
            canRemove={lines.length > 1}
            onChange={(patch) => updateLine(line.id, patch)}
            onRemove={() => removeLine(line.id)}
          />
        ))}
      </section>
    </div>
  );
}

/**
 * Satu rekening bank. Kode BIC dan negara tidak diisi pengguna maupun disimpan
 * pada baris: keduanya diturunkan dari bank yang dipilih, sehingga selalu
 * sejalan dengan daftar bank meski daftarnya kelak diperbarui.
 */
function BankLineBlock({ line, index, errors, canRemove, onChange, onRemove }) {
  const bank = findBank(line.bankCode);
  const prefix = `lines.${line.id}`;

  return (
    <fieldset className="taxdoc">
      <legend className="taxdoc__legend">Rekening {index + 1}</legend>

      <div className="field-grid">
        <SelectField
          label="Account type"
          options={asOptions(ACCOUNT_TYPES)}
          value={line.accountType}
          onChange={(e) => onChange({ accountType: e.target.value })}
          error={errors[`${prefix}.accountType`]}
          required
        />
        <SelectField
          label="Nama bank"
          options={BANKS.map((item) => ({ value: item.code, label: item.name }))}
          value={line.bankCode}
          onChange={(e) => onChange({ bankCode: e.target.value })}
          error={errors[`${prefix}.bankCode`]}
          required
        />

        <div className="field">
          <span className="field__label">Bank identifier code</span>
          <p className="taxgroup__derived">{bank?.bic ?? '—'}</p>
          <p className="field__hint">Terisi otomatis dari bank yang dipilih.</p>
        </div>
        <div className="field">
          <span className="field__label">Bank country</span>
          <p className="taxgroup__derived">{bank?.country ?? '—'}</p>
          <p className="field__hint">Terisi otomatis dari bank yang dipilih.</p>
        </div>

        <TextField
          label="Nomor rekening"
          inputMode="numeric"
          value={line.accountNumber}
          onChange={(e) => onChange({ accountNumber: e.target.value.replace(/[^\d-]/g, '') })}
          error={errors[`${prefix}.accountNumber`]}
          required
        />
        <TextField
          label="Nama pemilik rekening"
          value={line.accountHolder}
          onChange={(e) => onChange({ accountHolder: e.target.value })}
          error={errors[`${prefix}.accountHolder`]}
          required
        />

        <div className="span-full">
          <FileField
            label="Bank account statement"
            value={line.statement}
            onChange={(file) => onChange({ statement: file })}
            error={errors[`${prefix}.statement`]}
            required
          />
        </div>
      </div>

      {canRemove && (
        <Button variant="quiet" size="sm" onClick={onRemove}>
          Hapus rekening ini
        </Button>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Data pendaftaran — dipakai wizard pendaftaran dan halaman profil    */
/* ------------------------------------------------------------------ */
export function GeneralStep({ values, set, errors }) {
  // Bentuk badan usaha hanya relevan bila status badan hukumnya "Badan".
  const isEntity = values.legalStatus === LEGAL_STATUS_ENTITY;

  // Rincian jenis pasokan menyesuaikan jenis pasokan yang dipilih; menggantinya
  // mengosongkan rincian lama supaya tidak tersimpan pasangan yang tak cocok.
  const detailOptions = detailsForVendorType(values.vendorType);

  return (
    <div className="field-grid">
      <SelectField
        label="Status badan hukum"
        options={asOptions(LEGAL_STATUSES)}
        value={values.legalStatus}
        onChange={(e) => set({ legalStatus: e.target.value, entityType: '' })}
        error={errors.legalStatus}
        required
      />
      <SelectField
        label="Bentuk badan usaha"
        options={asOptions(ENTITY_TYPES)}
        value={values.entityType}
        onChange={(e) => set({ entityType: e.target.value })}
        error={errors.entityType}
        disabled={!isEntity}
        hint={isEntity ? undefined : 'Tersedia bila status badan hukum adalah badan.'}
        required={isEntity}
      />
      <TextField
        label="Nama perusahaan"
        className="span-full"
        value={values.vendorName}
        onChange={(e) => set({ vendorName: e.target.value })}
        error={errors.vendorName}
        required
      />
      <SelectField
        label="Jenis pasokan"
        options={asOptions(VENDOR_TYPES)}
        value={values.vendorType}
        onChange={(e) => set({ vendorType: e.target.value, vendorTypeDetail: '' })}
        error={errors.vendorType}
        required
      />
      <SelectField
        label="Rincian jenis pasokan"
        options={asOptions(detailOptions)}
        value={values.vendorTypeDetail}
        onChange={(e) => set({ vendorTypeDetail: e.target.value })}
        error={errors.vendorTypeDetail}
        disabled={!values.vendorType}
        hint={
          values.vendorType
            ? 'Pilihan menyesuaikan jenis pasokan.'
            : 'Pilih jenis pasokan terlebih dahulu.'
        }
        required
      />
      <SelectField
        label="Tipe vendor"
        options={asOptions(VENDOR_DIRECT_TYPES)}
        value={values.vendorDirectType}
        onChange={(e) => set({ vendorDirectType: e.target.value })}
        error={errors.vendorDirectType}
        hint="Direct transaction untuk pemasok yang menjual langsung, manufacturer untuk produsennya."
        required
      />
      <SelectField
        label="Rencana kerja sama"
        options={asOptions(OTV_STATUSES)}
        value={values.otvStatus}
        onChange={(e) => set({ otvStatus: e.target.value })}
        error={errors.otvStatus}
        hint="Pilih one time vendor bila hanya untuk satu transaksi."
        required
      />
      <div className="span-full">
        <CheckboxGroup
          legend="Perusahaan Paragon yang dituju"
          options={TARGET_COMPANIES}
          values={values.targetCompanies}
          onChange={(next) => set({ targetCompanies: next })}
          error={errors.targetCompanies}
        />
      </div>
      <TextField
        label="Email perusahaan"
        type="email"
        value={values.companyEmail}
        onChange={(e) => set({ companyEmail: e.target.value })}
        error={errors.companyEmail}
        required
      />
      <TextField
        label="Telepon kantor"
        value={values.officePhone}
        onChange={(e) => set({ officePhone: e.target.value })}
        error={errors.officePhone}
      />
      <TextField
        label="Nomor ponsel"
        value={values.mobilePhone}
        onChange={(e) => set({ mobilePhone: e.target.value })}
        error={errors.mobilePhone}
        required
      />
      <TextField
        label="Situs web"
        className="span-full"
        value={values.website}
        onChange={(e) => set({ website: e.target.value })}
        placeholder="https://"
      />
    </div>
  );
}

export function AddressStep({ values, set, errors }) {
  return (
    <div className="field-grid">
      <TextAreaField
        label="Alamat lengkap"
        className="span-full"
        rows={2}
        value={values.street}
        onChange={(e) => set({ street: e.target.value })}
        error={errors.street}
        required
      />
      <SelectField
        label="Negara"
        options={COUNTRIES}
        value={values.country}
        onChange={(e) => set({ country: e.target.value })}
        error={errors.country}
        required
      />
      <TextField
        label="Provinsi atau negara bagian"
        value={values.province}
        onChange={(e) => set({ province: e.target.value })}
        error={errors.province}
        required
      />
      <TextField
        label="Kota atau kabupaten"
        value={values.city}
        onChange={(e) => set({ city: e.target.value })}
        error={errors.city}
        required
      />
      <TextField
        label="Kode pos"
        inputMode="numeric"
        value={values.postalCode}
        onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, '') })}
        error={errors.postalCode}
        required
      />
      <TextField
        label="Kecamatan"
        value={values.district}
        onChange={(e) => set({ district: e.target.value })}
      />
      <TextField
        label="Kelurahan atau desa"
        value={values.subdistrict}
        onChange={(e) => set({ subdistrict: e.target.value })}
      />
    </div>
  );
}

export function ContactStep({ values, set, errors }) {
  return (
    <>
      <div className="notice notice--info" style={{ marginBottom: 'var(--sp-5)' }}>
        Email pada bagian ini menjadi alamat tujuan undangan portal bila pendaftaran Anda disetujui.
        Pastikan alamatnya aktif dan dipantau.
      </div>

      <div className="field-grid">
        <TextField
          label="Nama lengkap"
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          error={errors.name}
          required
        />
        <SelectField
          label="Sapaan"
          options={CONTACT_TITLES}
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          error={errors.title}
          required
        />
        <SelectField
          label="Bidang pekerjaan"
          options={JOB_POSITIONS}
          value={values.jobPosition}
          onChange={(e) => set({ jobPosition: e.target.value })}
          error={errors.jobPosition}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => set({ email: e.target.value })}
          error={errors.email}
          required
        />
        <TextField
          label="Telepon kantor"
          value={values.phone}
          onChange={(e) => set({ phone: e.target.value })}
          error={errors.phone}
        />
        <TextField
          label="Nomor ponsel"
          value={values.mobile}
          onChange={(e) => set({ mobile: e.target.value })}
          error={errors.mobile}
          required
        />
        <TextAreaField
          label="Catatan tambahan"
          className="span-full"
          rows={3}
          value={values.notes}
          onChange={(e) => set({ notes: e.target.value })}
          hint="Opsional. Misalnya riwayat kerja sama sebelumnya dengan Paragon."
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian 5 — Kontak perusahaan (maksimal 10)                         */
/* ------------------------------------------------------------------ */
const blankContact = () => ({
  id: `ct-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  title: '',
  jobPosition: '',
  email: '',
  phone: '',
  mobile: '',
  notes: '',
  isPrimary: false,
});

function ContactsSection({ values, setValues, errors }) {
  const contacts = values.length ? values : [{ ...blankContact(), isPrimary: true }];

  const update = (id, patch) =>
    setValues(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const setPrimary = (id) =>
    setValues(contacts.map((c) => ({ ...c, isPrimary: c.id === id })));

  const add = () => setValues([...contacts, blankContact()]);

  const remove = (id) => {
    const rest = contacts.filter((c) => c.id !== id);
    // Kontak utama tidak boleh hilang saat barisnya dihapus.
    if (rest.length && !rest.some((c) => c.isPrimary)) rest[0].isPrimary = true;
    setValues(rest);
  };

  return (
    <div className="stack">
      <p className="text-sm muted">
        Tambahkan sampai {MAX_CONTACTS} kontak. Tandai satu orang sebagai kontak utama — dialah yang
        menerima pemberitahuan pesanan dan tagihan.
      </p>

      {errors.contacts && (
        <p className="field__error" role="alert">
          {errors.contacts}
        </p>
      )}

      {contacts.map((contact, index) => (
        <fieldset key={contact.id} className="contact-card" style={{ border: '1px solid var(--line-soft)' }}>
          <legend className="visually-hidden">Kontak {index + 1}</legend>

          <div className="contact-card__head">
            <span className="contact-card__index">Kontak {index + 1}</span>
            <div className="row">
              <Checkbox
                label="Kontak utama"
                checked={contact.isPrimary}
                onChange={() => setPrimary(contact.id)}
              />
              {contacts.length > 1 && (
                <Button variant="quiet" size="sm" onClick={() => remove(contact.id)}>
                  Hapus
                </Button>
              )}
            </div>
          </div>

          <div className="field-grid">
            <TextField
              label="Nama lengkap"
              value={contact.name}
              onChange={(e) => update(contact.id, { name: e.target.value })}
              error={errors[`${contact.id}.name`]}
              required
            />
            <SelectField
              label="Sapaan"
              options={CONTACT_TITLES}
              value={contact.title}
              onChange={(e) => update(contact.id, { title: e.target.value })}
              error={errors[`${contact.id}.title`]}
              required
            />
            <SelectField
              label="Bidang pekerjaan"
              options={JOB_POSITIONS}
              value={contact.jobPosition}
              onChange={(e) => update(contact.id, { jobPosition: e.target.value })}
              error={errors[`${contact.id}.jobPosition`]}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={contact.email}
              onChange={(e) => update(contact.id, { email: e.target.value })}
              error={errors[`${contact.id}.email`]}
              required
            />
            <TextField
              label="Telepon kantor"
              value={contact.phone}
              onChange={(e) => update(contact.id, { phone: e.target.value })}
              error={errors[`${contact.id}.phone`]}
            />
            <TextField
              label="Nomor ponsel"
              value={contact.mobile}
              onChange={(e) => update(contact.id, { mobile: e.target.value })}
              error={errors[`${contact.id}.mobile`]}
              required
            />
            <TextAreaField
              label="Catatan"
              className="span-full"
              rows={2}
              value={contact.notes}
              onChange={(e) => update(contact.id, { notes: e.target.value })}
            />
          </div>
        </fieldset>
      ))}

      {contacts.length < MAX_CONTACTS && (
        <Button variant="secondary" onClick={add}>
          Tambah kontak
        </Button>
      )}
    </div>
  );
}
