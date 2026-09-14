import './auth-shell.css';

/**
 * Kerangka dua kolom untuk seluruh layar masuk.
 * Panel kiri membawa identitas Paragon, panel kanan menampung formulir.
 * `tone="internal"` menandai konsol internal agar staf langsung tahu
 * mereka tidak berada di portal pemasok.
 */
export default function AuthShell({ tone = 'supplier', eyebrow, headline, blurb, stats, children }) {
  return (
    <div className={`auth-shell auth-shell--${tone}`}>
      <aside className="auth-shell__brand">
        <div className="auth-shell__mark">
          <span className="auth-shell__glyph" aria-hidden="true">
            PC
          </span>
          <span>Paragon Supply Collaboration Hub</span>
        </div>

        <div>
          {eyebrow && <p className="auth-shell__eyebrow">{eyebrow}</p>}
          <h1 className="auth-shell__headline">{headline}</h1>
          <p className="auth-shell__blurb">{blurb}</p>

          {stats && (
            <dl className="auth-shell__stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <p className="auth-shell__foot">
          Butuh bantuan? Hubungi tim procurement di supplier.support@paragon-corp.com
        </p>
      </aside>

      <main className="auth-shell__panel" id="main">
        <div className="auth-shell__form">{children}</div>
      </main>
    </div>
  );
}
