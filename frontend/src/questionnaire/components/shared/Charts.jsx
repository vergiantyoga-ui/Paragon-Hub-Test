import './charts.css';

/**
 * Grafik SVG sederhana, tanpa pustaka pihak ketiga.
 *
 * Bentuk yang diminta spesifikasi — bilah, donat, dan sebaran — cukup
 * digambar sendiri, jadi tidak ada dependensi baru yang perlu ditambahkan.
 * Setiap grafik disertai tabel tersembunyi berisi angka aslinya, karena
 * grafik saja tidak terbaca pembaca layar.
 */

const PALETTE = ['#2547b8', '#3b82f6', '#60a5fa', '#93c5fd', '#c7d7fb'];

const TONE = {
  low: '#15803d',
  medium: '#a16207',
  high: '#b91c1c',
  critical: '#7f1d1d',
  unscored: '#9ca3af',
};

/** Bilah mendatar; cocok untuk perbandingan antar kategori berlabel panjang. */
export function BarChart({ title, data, unit = '' }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>

      <div className="chart__bars">
        {data.map((item, index) => (
          <div className="chart__barrow" key={item.label}>
            <span className="chart__barlabel">{item.label}</span>
            <div className="chart__bartrack">
              <div
                className="chart__barfill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color ?? PALETTE[index % PALETTE.length],
                }}
              />
            </div>
            <span className="chart__barvalue">
              {item.value}
              {unit}
            </span>
          </div>
        ))}
      </div>

      <DataTable title={title} data={data} unit={unit} />
    </figure>
  );
}

/** Donat untuk sebaran proporsi. */
export function DonutChart({ title, data, centerLabel, centerValue }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>

      {total === 0 ? (
        <p className="chart__empty">Belum ada data untuk ditampilkan.</p>
      ) : (
        <div className="chart__donutwrap">
          <svg viewBox="0 0 140 140" className="chart__donut" role="presentation">
            <circle cx="70" cy="70" r={radius} className="chart__donuttrack" />
            {data
              .filter((item) => item.value > 0)
              .map((item) => {
                const portion = item.value / total;
                const dash = portion * circumference;
                const element = (
                  <circle
                    key={item.label}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={item.color ?? TONE[item.id] ?? PALETTE[0]}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 70 70)"
                  />
                );
                offset += dash;
                return element;
              })}
            <text x="70" y="66" className="chart__donutvalue">
              {centerValue ?? total}
            </text>
            <text x="70" y="84" className="chart__donutlabel">
              {centerLabel ?? 'total'}
            </text>
          </svg>

          <ul className="chart__legend">
            {data
              .filter((item) => item.value > 0)
              .map((item) => (
                <li key={item.label}>
                  <span
                    className="chart__swatch"
                    style={{ background: item.color ?? TONE[item.id] ?? PALETTE[0] }}
                    aria-hidden="true"
                  />
                  {item.label}
                  <strong>{item.value}</strong>
                </li>
              ))}
          </ul>
        </div>
      )}

      <DataTable title={title} data={data} />
    </figure>
  );
}

/** Cincin tunggal untuk satu angka persentase. */
export function GaugeChart({ title, percent, caption }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, percent ?? 0));
  const dash = (safe / 100) * circumference;

  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>

      <div className="chart__donutwrap">
        <svg viewBox="0 0 120 120" className="chart__gauge" role="img" aria-label={`${title}: ${safe}%`}>
          <circle cx="60" cy="60" r={radius} className="chart__donuttrack" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="66" className="chart__donutvalue">
            {safe}%
          </text>
        </svg>

        {caption && <p className="chart__caption">{caption}</p>}
      </div>
    </figure>
  );
}

/** Angka aslinya, tersembunyi secara visual tetapi terbaca pembaca layar. */
function DataTable({ title, data, unit = '' }) {
  return (
    <table className="visually-hidden">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Kategori</th>
          <th scope="col">Nilai</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.label}>
            <th scope="row">{item.label}</th>
            <td>
              {item.value}
              {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
