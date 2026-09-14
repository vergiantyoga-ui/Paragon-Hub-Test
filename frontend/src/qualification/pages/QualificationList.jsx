import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAppState } from '../../store/AppStore.jsx';
import {
  QUALIFICATION_STATUS,
  QUALIFICATION_STATUS_LABEL,
  QUALIFICATION_STATUS_TONE,
  canFillQualification,
  isEligible,
  summariseLines,
} from '../qualificationRules.js';
import { findCommodity, findCountry } from '../data/referenceData.js';
import { formatDate } from '../../lib/format.js';
import './qualification.css';
import { VENDOR_TYPES, labelOf } from '../../lib/masterData.js';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: QUALIFICATION_STATUS.NOT_STARTED, label: 'Belum diisi' },
  { id: QUALIFICATION_STATUS.DRAFT, label: 'Draf' },
  { id: QUALIFICATION_STATUS.COMPLETED, label: 'Selesai' },
];

/**
 * Daftar pemasok yang layak dikualifikasi.
 *
 * Hanya pemasok aktif yang muncul — profilnya sudah tuntas dan disetujui,
 * sehingga kualifikasi berdiri di atas data yang sudah terverifikasi.
 */
export default function QualificationList() {
  const { submissions, qualifications, session } = useAppState();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const user = session?.user;
  const canFill = canFillQualification(user);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();

    return submissions
      .filter(isEligible)
      .map((submission) => {
        const record = qualifications[submission.id];
        return {
          submission,
          record,
          status: record?.status ?? QUALIFICATION_STATUS.NOT_STARTED,
          summary: summariseLines(record?.lines),
        };
      })
      .filter((row) => (filter === 'all' ? true : row.status === filter))
      .filter(
        (row) =>
          !term ||
          row.submission.general.vendorName.toLowerCase().includes(term) ||
          row.submission.id.toLowerCase().includes(term),
      );
  }, [submissions, qualifications, filter, query]);

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Kualifikasi' }]}
        icon="verify"
        title="Kualifikasi pemasok"
        description="Tentukan kategori komoditas dan negara asal pasokan. Terbuka begitu pemasok mengirimkan profilnya, tanpa menunggu verifikasi dokumen selesai."
      />

      <div className="qlist__toolbar">
        <div className="qlist__search">
          <label className="visually-hidden" htmlFor="qual-search">
            Cari pemasok
          </label>
          <input
            id="qual-search"
            type="search"
            className="input"
            placeholder="Cari nama atau nomor pemasok"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="queue-filters" role="group" aria-label="Saring menurut status kualifikasi">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="queue-filter"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Tidak ada pemasok pada saringan ini"
            description="Kualifikasi terbuka setelah pemasok mengirimkan profilnya. Pada jalur registrasi internal, pengiriman itu terjadi setelah manager menyetujui isian admin."
            action={
              <Button variant="secondary" onClick={() => { setFilter('all'); setQuery(''); }}>
                Tampilkan semua
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card qlist__tablewrap">
          <table className="qtable">
            <caption className="visually-hidden">Daftar kualifikasi pemasok</caption>
            <thead>
              <tr>
                <th scope="col">Pemasok</th>
                <th scope="col">Status onboarding</th>
                <th scope="col">Kualifikasi</th>
                <th scope="col" className="qtable__num">Baris</th>
                <th scope="col">Komoditas</th>
                <th scope="col">Negara</th>
                <th scope="col">Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ submission, record, status, summary }) => (
                <tr key={submission.id}>
                  <th scope="row">
                    <Link to={`/internal/kualifikasi/${submission.id}`} className="qtable__link">
                      {submission.general.vendorName}
                    </Link>
                    <span className="qtable__sub">
                      {submission.id} · {labelOf(VENDOR_TYPES, submission.general.vendorType)}
                    </span>
                  </th>
                  <td>
                    <StatusBadge status={submission.status} />
                  </td>
                  <td>
                    <span className={`pill pill--${QUALIFICATION_STATUS_TONE[status]}`}>
                      {QUALIFICATION_STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="qtable__num">{summary.lines}</td>
                  <td>{previewCommodities(record?.lines)}</td>
                  <td>{previewCountries(record?.lines)}</td>
                  <td>
                    {record ? formatDate(record.updatedAt) : '—'}
                    {record?.updatedBy && <span className="qtable__sub">{record.updatedBy}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canFill && (
        <p className="text-sm muted" style={{ marginTop: 'var(--sp-4)' }}>
          Anda dapat meninjau kualifikasi, tetapi pengisiannya dilakukan staf procurement.
        </p>
      )}
    </>
  );
}

/** Menampilkan dua nama pertama agar kolom tetap ringkas. */
function previewCommodities(lines = []) {
  const names = [...new Set(lines.map((line) => findCommodity(line.commodityCode)?.name))].filter(
    Boolean,
  );
  return truncateList(names);
}

function previewCountries(lines = []) {
  const names = [...new Set(lines.map((line) => findCountry(line.countryCode)?.name))].filter(
    Boolean,
  );
  return truncateList(names);
}

function truncateList(names) {
  if (names.length === 0) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}
