import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import PasswordField from '../../components/ui/PasswordField.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import { STATUS } from '../../lib/constants.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Masuk konsol internal. Email wajib berdomain @paragon-corp.com,
 * dan role menentukan menu yang muncul setelah masuk.
 */
export default function StaffLogin() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { signInInternal } = useAppActions();
  const { submissions, internalUsers } = useAppState();
  const navigate = useNavigate();

  const pendingCount = submissions.filter((s) => s.status === STATUS.SUPPLIER_REQUEST).length;

  function handleSubmit(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();

    if (!value.endsWith('@paragon-corp.com')) {
      setError('Gunakan email kerja Paragon yang berakhiran @paragon-corp.com.');
      return;
    }
    if (!password.trim()) {
      setError('Masukkan kata sandi Anda.');
      return;
    }

    const result = signInInternal(value);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    navigate('/internal/antrian');
  }

  return (
    <AuthShell
      tone="internal"
      eyebrow="Konsol procurement"
      headline="Tinjau, setujui, dan hubungkan pemasok baru dari satu layar."
      blurb="Akses terbatas untuk tim procurement Paragon Corp Indonesia dan Malaysia. Pemasok mendaftar melalui portal terpisah."
      stats={[
        { value: String(pendingCount), label: 'Registrasi menunggu ditinjau' },
        { value: '2 jalur', label: 'Undang pemasok atau isi internal' },
      ]}
    >
      <h2>{t('login.staff.title')}</h2>
      <p className="auth-shell__lede">{t('login.staff.lede')}</p>

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label={t('login.workEmail')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@paragon-corp.com"
          error={error}
          autoComplete="username"
          required
        />
        <PasswordField
          label={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" block>
          {t('common.signIn')}
        </Button>
      </form>

      <p className="auth-shell__switch">
        {t('login.notStaff')}{' '}
        <Link to="/masuk" className="link-btn">
          {t('login.backToSupplier')}
        </Link>
      </p>

      <div className="demo-hint">
        <h3>{t('login.demoAccounts')}</h3>
        <ul>
          {internalUsers.map((user) => (
            <li key={user.id}>
              <code>{user.email}</code> — {t(`role.${user.role}`)}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 8 }}>{t('login.anyPassword')}</p>
      </div>
    </AuthShell>
  );
}
