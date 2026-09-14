import { useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useQuestionnaireState } from '../../store/QuestionnaireStore.jsx';
import { formatDateTime } from '../../../lib/format.js';
import './template-list.css';

/**
 * Jejak audit modul kuesioner.
 *
 * Catatan ini hidup di memori selama sesi berjalan. Persistensinya adalah
 * pekerjaan backend; struktur entrinya sudah mengikuti bagian 22 spesifikasi
 * sehingga penyimpanannya kelak tinggal disambungkan.
 */
export default function AuditTrail() {
  const { auditLog } = useQuestionnaireState();
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const rows = auditLog.filter(
    (entry) =>
      !term ||
      entry.action.toLowerCase().includes(term) ||
      entry.actorName.toLowerCase().includes(term) ||
      entry.objectType.toLowerCase().includes(term),
  );

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Jejak audit' }]}
        icon="document"
        title="Jejak audit"
        description="Setiap tindakan penting pada modul kuesioner beserta pelaku dan waktunya."
      />

      <div className="qlist__toolbar">
        <div className="qlist__search">
          <label className="visually-hidden" htmlFor="audit-search">
            Cari jejak audit
          </label>
          <input
            id="audit-search"
            type="search"
            className="input"
            placeholder="Cari tindakan, pelaku, atau objek"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title={auditLog.length === 0 ? 'Belum ada tindakan tercatat' : 'Tidak ada yang cocok'}
            description={
              auditLog.length === 0
                ? 'Membuat, menyunting, menerbitkan, atau menugaskan kuesioner akan tercatat di sini. Catatan ini bertahan selama sesi berjalan.'
                : 'Ubah kata kunci pencarian Anda.'
            }
          />
        </div>
      ) : (
        <Card>
          <ul className="timeline">
            {rows.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.action}</strong>
                  <span className="muted"> pada {entry.objectType}</span>
                </span>
                {entry.newValue && <span className="text-sm muted">{entry.newValue}</span>}
                <time dateTime={entry.at}>
                  {formatDateTime(entry.at)} · {entry.actorName}
                </time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
