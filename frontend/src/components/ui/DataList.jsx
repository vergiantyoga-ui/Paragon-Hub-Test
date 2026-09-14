import { orDash } from '../../lib/format.js';

/** Menampilkan pasangan label/nilai untuk data yang tidak bisa diubah. */
export default function DataList({ items }) {
  return (
    <dl className="datalist">
      {items.map(({ label, value, full }) => (
        <div key={label} style={full ? { gridColumn: '1 / -1' } : undefined}>
          <dt>{label}</dt>
          <dd>{orDash(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
