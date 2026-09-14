import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import {
  GeneralStep,
  AddressStep,
  ContactStep,
} from '../../components/profile/ProfileSectionForm.jsx';
import {
  TextField,
  SelectField,
  TextAreaField,
  CheckboxGroup,
} from '../../components/ui/Field.jsx';
import { useAppActions } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
  CONTACT_TITLES,
  COUNTRIES,
  ENTITY_TYPES,
  JOB_POSITIONS,
  LEGAL_STATUSES,
  OTV_STATUSES,
  TARGET_COMPANIES,
  VENDOR_TYPES,
} from '../../lib/constants.js';
import { validateSection } from '../../lib/profileRules.js';
import './register.css';

const STEPS = [
  { id: 'general', label: 'Data umum' },
  { id: 'address', label: 'Alamat perusahaan' },
  { id: 'contact', label: 'Kontak penanggung jawab' },
];

const initialForm = {
  general: {
    legalStatus: '',
    entityType: '',
    vendorName: '',
    vendorType: '',
    vendorTypeDetail: '',
    targetCompanies: [],
    otvStatus: '',
    companyEmail: '',
    officePhone: '',
    mobilePhone: '',
    website: '',
  },
  address: {
    street: '',
    country: '',
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postalCode: '',
  },
  contact: {
    name: '',
    title: '',
    jobPosition: '',
    email: '',
    phone: '',
    mobile: '',
    notes: '',
  },
};

/**
 * Pendaftaran pemasok baru. Tiga langkah, maju hanya bila langkah
 * berjalan sudah valid, sehingga galat tidak menumpuk di akhir.
 */
export default function RegisterWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submittedId, setSubmittedId] = useState(null);
  const { registerSupplier } = useAppActions();
  const toast = useToast();
  const navigate = useNavigate();

  const current = STEPS[step];
  const setSection = (sectionId, patch) =>
    setForm((f) => ({ ...f, [sectionId]: { ...f[sectionId], ...patch } }));

  function goNext() {
    const found = validateSection(current.id, form[current.id]);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    const id = registerSupplier(form);
    setSubmittedId(id);
    toast.success('Pendaftaran terkirim ke tim procurement.');
  }

  if (submittedId) {
    return (
      <div className="register">
        <div className="register__panel register__panel--narrow">
          <span className="pill pill--success">Terkirim</span>
          <h1 style={{ marginTop: 'var(--sp-4)' }}>Pendaftaran Anda sudah kami terima</h1>
          <p className="muted" style={{ marginTop: 'var(--sp-3)' }}>
            Nomor pengajuan Anda <strong>{submittedId}</strong>. Tim procurement Paragon meninjau
            data yang Anda kirim, biasanya dalam beberapa hari kerja.
          </p>

          <div className="notice notice--info" style={{ margin: 'var(--sp-5) 0' }}>
            <span className="notice__title">Yang terjadi berikutnya</span>
            Bila pendaftaran disetujui, kami mengirim ID akun dan kata sandi sementara ke{' '}
            <strong>{form.contact.email}</strong>. Kata sandi itu berlaku tujuh hari sejak email
            dikirim, jadi mohon segera digunakan.
          </div>

          <Button onClick={() => navigate('/masuk')}>Kembali ke halaman masuk</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="register">
      <header className="register__head">
        <Link to="/masuk" className="link-btn">
          ← Kembali ke halaman masuk
        </Link>
        <h1>Daftar sebagai pemasok Paragon</h1>
        <p className="muted">
          Isi tiga bagian singkat di bawah. Dokumen legalitas baru diminta setelah pendaftaran Anda
          disetujui.
        </p>
      </header>

      <ol className="register__steps" aria-label="Langkah pendaftaran">
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            className={[
              'register__step',
              index === step ? 'register__step--current' : '',
              index < step ? 'register__step--done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className="register__step-num" aria-hidden="true">
              {index < step ? '✓' : index + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>

      <div className="register__panel">
        <h2 className="card__title" style={{ marginBottom: 'var(--sp-5)' }}>
          {current.label}
        </h2>

        {current.id === 'general' && (
          <GeneralStep
            values={form.general}
            set={(patch) => setSection('general', patch)}
            errors={errors}
          />
        )}
        {current.id === 'address' && (
          <AddressStep
            values={form.address}
            set={(patch) => setSection('address', patch)}
            errors={errors}
          />
        )}
        {current.id === 'contact' && (
          <ContactStep
            values={form.contact}
            set={(patch) => setSection('contact', patch)}
            errors={errors}
          />
        )}

        <div className="form-actions">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Kembali
            </Button>
          )}
          <Button onClick={goNext}>
            {step === STEPS.length - 1 ? 'Kirim pendaftaran' : 'Lanjut'}
          </Button>
        </div>
      </div>
    </div>
  );
}
