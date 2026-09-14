import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { validateEmail } from '../../lib/validation.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const problem = validateEmail(email);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSent(true);
  }

  return (
    <AuthShell
      headline="Atur ulang kata sandi Anda."
      blurb="Tautan pengaturan ulang dikirim ke alamat email yang terdaftar pada akun pemasok Anda."
    >
      <h2>Lupa kata sandi</h2>

      {sent ? (
        <>
          <div className="notice notice--success" style={{ marginBottom: 'var(--sp-5)' }}>
            <span className="notice__title">Tautan sudah dikirim</span>
            Periksa kotak masuk {email}. Tautan berlaku 24 jam. Bila tidak muncul dalam beberapa
            menit, periksa folder spam.
          </div>
          <Button to="/masuk" variant="secondary" block>
            Kembali ke halaman masuk
          </Button>
        </>
      ) : (
        <>
          <p className="auth-shell__lede">
            Masukkan email yang Anda daftarkan. Kami kirimkan tautan untuk membuat kata sandi baru.
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label="Alamat email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              autoComplete="email"
              required
            />
            <Button type="submit" block>
              Kirim tautan
            </Button>
          </form>

          <p className="auth-shell__switch">
            <Link to="/masuk" className="link-btn">
              Kembali ke halaman masuk
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
