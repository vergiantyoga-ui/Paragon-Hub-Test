import { Component } from 'react';

/**
 * Penangkap galat render.
 *
 * Tanpa ini, satu galat saat render membuat React melepas seluruh pohon dan
 * pengguna hanya melihat layar kosong — tanpa petunjuk apa pun tentang apa yang
 * salah maupun di mana. Komponen ini mengubah keadaan itu menjadi pesan yang
 * dapat dibaca, lengkap dengan rincian teknis yang bisa disalin dan dilampirkan
 * saat melaporkan masalah.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Tetap dicatat ke konsol agar terlihat pada alat pengembang.
    console.error('Galat render:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const detail = [
      error.message,
      error.stack?.split('\n').slice(0, 4).join('\n'),
      info?.componentStack?.split('\n').slice(0, 8).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n');

    return (
      <div className="crash">
        <div className="crash__card">
          <h1 className="crash__title">Halaman ini gagal ditampilkan</h1>
          <p className="crash__lede">
            Terjadi kesalahan saat menyiapkan tampilan. Data Anda pada sesi ini tidak
            terpengaruh selama halaman belum disegarkan.
          </p>

          <div className="crash__actions">
            <button type="button" className="btn btn--primary" onClick={this.handleReset}>
              Coba tampilkan ulang
            </button>
            <a className="btn btn--secondary" href="/">
              Kembali ke halaman masuk
            </a>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigator.clipboard?.writeText(detail)}
            >
              Salin rincian galat
            </button>
          </div>

          <details className="crash__details">
            <summary>Rincian teknis</summary>
            <pre>{detail}</pre>
          </details>
        </div>
      </div>
    );
  }
}
