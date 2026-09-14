import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-5)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-3)' }}>
          Halaman ini tidak ada
        </h1>
        <p className="muted" style={{ marginBottom: 'var(--sp-5)' }}>
          Tautan yang Anda buka mungkin sudah berubah. Kembali ke halaman masuk untuk melanjutkan.
        </p>
        <Button to="/masuk">Ke halaman masuk</Button>
      </div>
    </div>
  );
}
