import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PasswordField from '../../components/ui/PasswordField.jsx';
import { useAppActions, useCurrentSubmission } from '../../store/AppStore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { daysFromNow, passwordExpiryFrom } from '../../lib/format.js';
import { collectErrors } from '../../lib/validation.js';

/**
 * Ganti kata sandi sementara. Wajib dilalui sebelum pemasok bisa
 * membuka bagian mana pun dari portal.
 */
export default function ChangePassword() {
  const submission = useCurrentSubmission();
  const { changePassword } = useAppActions();
  const [values, setValues] = useState({ next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const navigate = useNavigate();

  if (submission?.account?.passwordChanged) {
    return <Navigate to="/portal/status" replace />;
  }

  const expiresAt = passwordExpiryFrom(submission.account.emailSentAt);
  const daysLeft = daysFromNow(expiresAt);

  function handleSubmit(event) {
    event.preventDefault();
    const found = collectErrors({
      next:
        values.next.length < 10
          ? 'Kata sandi baru minimal 10 karakter.'
          : /^[a-zA-Z]+$/.test(values.next)
            ? 'Gabungkan huruf dengan angka atau simbol.'
            : null,
      confirm: values.next !== values.confirm ? 'Kedua kata sandi belum sama.' : null,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    changePassword(submission.id, values.next);
    toast.success('Kata sandi baru tersimpan.');
    navigate('/portal/status');
  }

  return (
    <div style={{ maxWidth: 520, marginInline: 'auto' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-2)' }}>
        Buat kata sandi baru
      </h1>
      <p className="muted" style={{ marginBottom: 'var(--sp-5)' }}>
        Kata sandi sementara dari email undangan hanya berlaku sekali. Buat kata sandi Anda sendiri
        untuk melanjutkan.
      </p>

      {daysLeft !== null && daysLeft <= 2 && (
        <div className="notice notice--warn" style={{ marginBottom: 'var(--sp-5)' }}>
          <span className="notice__title">
            {daysLeft > 0 ? `Sisa ${daysLeft} hari` : 'Kata sandi sementara sudah kedaluwarsa'}
          </span>
          {daysLeft > 0
            ? 'Selesaikan penggantian kata sandi sebelum masa berlakunya habis.'
            : 'Hubungi tim procurement untuk meminta undangan baru.'}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <PasswordField
            label="Kata sandi baru"
            value={values.next}
            onChange={(e) => setValues({ ...values, next: e.target.value })}
            error={errors.next}
            hint="Minimal 10 karakter, gabungkan huruf dengan angka atau simbol."
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Ulangi kata sandi baru"
            value={values.confirm}
            onChange={(e) => setValues({ ...values, confirm: e.target.value })}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />
          <Button type="submit" block>
            Simpan kata sandi
          </Button>
        </form>
      </Card>
    </div>
  );
}
