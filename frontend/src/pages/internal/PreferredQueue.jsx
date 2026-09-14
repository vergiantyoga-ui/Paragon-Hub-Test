import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import { useQuestionnaireState } from '../../questionnaire/store/QuestionnaireStore.jsx';
import { summariseLines } from '../../qualification/qualificationRules.js';
import { ROLE, STATUS } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import './preferred.css';
import { VENDOR_TYPES, labelOf } from '../../lib/masterData.js';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: STATUS.QUALIFICATION, label: 'Tahap qualification' },
  { id: STATUS.AWAITING_PREFERRED, label: 'Menunggu keputusan' },
  { id: STATUS.PREFERRED, label: 'Preferred' },
  { id: STATUS.DISQUALIFIED, label: 'Disqualification' },
];

const TRACKED = [
  STATUS.QUALIFICATION,
  STATUS.AWAITING_PREFERRED,
  STATUS.PREFERRED,
  STATUS.DISQUALIFIED,
];

/**
 * Daftar pemasok pada tahap qualification hingga keputusan preferred.
 *
 * Staf procurement mengajukan pemasok yang berkasnya sudah lengkap; manager
 * yang memutuskan. Pengajuan hanya terbuka bila kualifikasi sudah terisi,
 * karena manager memang diminta menilainya.
 */
export default function PreferredQueue() {
  const { submissions, qualifications, session } = useAppState();
  const { submitForPreferred } = useAppActions();
  const questionnaireState = useQuestionnaireState();
  const toast = useToast();
  const [filter, setFilter] = useState('all');

  const user = session?.user;
  const isManager = user?.role === ROLE.MANAGER;

  const rows = submissions
    .filter((item) => TRACKED.includes(item.status))
    .filter((item) => (filter === 'all' ? true : item.status === filter))
    .map((submission) => {
      const qualification = qualifications[submission.id];
      const responseCount = questionnaireState.assignments.filter(
        (assignment) => assignment.supplierId === submission.id,
      ).length;

      return {
        submission,
        qualification,
        summary: summariseLines(qualification?.lines),
        responseCount,
      };
    });

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Preferred supplier' }]}
        icon="approval"
        title="Preferred supplier"
        description="Manager procurement menilai profil, dokumen, kualifikasi, dan kuesioner pemasok sebelum menetapkannya sebagai preferred."
      />

      <div className="queue-filters" role="group" aria-label="Saring menurut tahap">
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
            title="Tidak ada pemasok pada saringan ini"
            description="Pemasok masuk tahap ini setelah dokumennya lolos periksa. Staf procurement kemudian mengisi kualifikasi dan menugaskan kuesioner sebelum mengajukannya ke manager."
            action={<Button variant="secondary" onClick={() => setFilter('all')}>Tampilkan semua</Button>}
          />
        </div>
      ) : (
        <div className="card qlist__tablewrap">
          <table className="qtable">
            <caption className="visually-hidden">Daftar pemasok menuju preferred</caption>
            <thead>
              <tr>
                <th scope="col">Pemasok</th>
                <th scope="col">Tahap</th>
                <th scope="col" className="qtable__num">Baris kualifikasi</th>
                <th scope="col" className="qtable__num">Kuesioner</th>
                <th scope="col">Diperbarui</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ submission, summary, responseCount }) => {
                const readyToSubmit =
                  submission.status === STATUS.QUALIFICATION && summary.lines > 0;

                return (
                  <tr key={submission.id}>
                    <th scope="row">
                      <Link to={`/internal/preferred/${submission.id}`} className="qtable__link">
                        {submission.general.vendorName}
                      </Link>
                      <span className="qtable__sub">
                        {submission.id} · {labelOf(VENDOR_TYPES, submission.general.vendorType)}
                      </span>
                    </th>
                    <td>
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="qtable__num">{summary.lines}</td>
                    <td className="qtable__num">{responseCount}</td>
                    <td>
                      {formatDate(
                        submission.preferredDecision?.decidedAt ??
                          submission.preferredSubmittedAt ??
                          submission.registeredAt,
                      )}
                    </td>
                    <td>
                      {submission.status === STATUS.QUALIFICATION && !isManager && (
                        <Button
                          size="sm"
                          disabled={!readyToSubmit}
                          title={
                            readyToSubmit
                              ? undefined
                              : 'Isi kualifikasi pemasok terlebih dahulu.'
                          }
                          onClick={() => {
                            submitForPreferred(submission.id, user);
                            toast.success('Diajukan ke manager procurement.');
                          }}
                        >
                          Ajukan
                        </Button>
                      )}
                      {submission.status === STATUS.AWAITING_PREFERRED && isManager && (
                        <Button size="sm" to={`/internal/preferred/${submission.id}`}>
                          Tinjau
                        </Button>
                      )}
                      {submission.status === STATUS.QUALIFICATION && isManager && (
                        <span className="text-xs muted">Menunggu diajukan staf</span>
                      )}
                    </td>
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
