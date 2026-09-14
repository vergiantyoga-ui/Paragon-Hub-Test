import { useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import CompletionBar from '../../components/shared/CompletionBar.jsx';
import { useQuestionnaireState, assignmentView } from '../../store/QuestionnaireStore.jsx';
import { calculateCompletion, RESPONSE_STATUS } from '../../engine/index.js';
import { RESPONSE_STATUS_LABEL, RESPONSE_STATUS_TONE } from '../../store/assignmentMockData.js';
import { formatDate, daysFromNow } from '../../../lib/format.js';
import './template-list.css';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'open', label: 'Belum selesai' },
  { id: RESPONSE_STATUS.SUBMITTED, label: 'Terkirim' },
  { id: 'overdue', label: 'Terlambat' },
];

/** Pemantauan penugasan: siapa sudah mengisi, sampai mana, dan mana yang lewat tenggat. */
export default function AssignmentList() {
  const state = useQuestionnaireState();
  const [filter, setFilter] = useState('all');

  const rows = state.assignments
    .map((assignment) => assignmentView(state, assignment.id))
    .filter((row) => row.version)
    .filter(({ assignment, response }) => {
      const overdue =
        daysFromNow(assignment.dueDate) < 0 && response?.status !== RESPONSE_STATUS.SUBMITTED;

      if (filter === 'all') return true;
      if (filter === 'overdue') return overdue;
      if (filter === 'open') return response?.status !== RESPONSE_STATUS.SUBMITTED;
      return response?.status === filter;
    });

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Penugasan' }]}
        icon="queue"
        title="Penugasan kuesioner"
        description="Pantau kuesioner yang sudah ditugaskan dan sejauh mana pemasok mengisinya."
        actions={<Button to="/internal/penugasan/baru">Tugaskan kuesioner</Button>}
      />

      <div className="queue-filters" role="group" aria-label="Saring penugasan">
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

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Tidak ada penugasan pada saringan ini"
            description="Ubah saringan, atau tugaskan kuesioner kepada pemasok."
            action={<Button variant="secondary" onClick={() => setFilter('all')}>Tampilkan semua</Button>}
          />
        </div>
      ) : (
        <div className="card qlist__tablewrap">
          <table className="qtable">
            <caption className="visually-hidden">Daftar penugasan kuesioner</caption>
            <thead>
              <tr>
                <th scope="col">Pemasok</th>
                <th scope="col">Kuesioner</th>
                <th scope="col">Tenggat</th>
                <th scope="col">Status</th>
                <th scope="col">Kemajuan</th>
                <th scope="col">Peninjau</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ assignment, response, version, template }) => {
                const completion = calculateCompletion(
                  version,
                  response?.answers ?? {},
                  response?.attachments ?? {},
                );
                const remaining = daysFromNow(assignment.dueDate);
                const overdue = remaining < 0 && response?.status !== RESPONSE_STATUS.SUBMITTED;

                return (
                  <tr key={assignment.id}>
                    <th scope="row">
                      {assignment.supplierName}
                      <span className="qtable__sub">{assignment.supplierSite}</span>
                    </th>
                    <td>
                      {template.name}
                      <span className="qtable__sub">
                        {version.versionLabel} · {assignment.materialCategory}
                      </span>
                    </td>
                    <td>
                      {formatDate(assignment.dueDate)}
                      {overdue && (
                        <span className="qtable__sub" style={{ color: 'var(--danger)' }}>
                          terlambat {Math.abs(remaining)} hari
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`pill pill--${RESPONSE_STATUS_TONE[response?.status] ?? 'neutral'}`}>
                        {RESPONSE_STATUS_LABEL[response?.status] ?? '—'}
                      </span>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <CompletionBar
                        percent={completion.percent}
                        label={`Kemajuan ${assignment.supplierName}`}
                      />
                    </td>
                    <td>{assignment.reviewerName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
