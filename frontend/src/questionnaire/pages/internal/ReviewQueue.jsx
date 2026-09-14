import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';
import ScorePill from '../../components/shared/ScorePill.jsx';
import { useQuestionnaireState, assignmentView } from '../../store/QuestionnaireStore.jsx';
import { awaitsReview, calculateScore } from '../../engine/index.js';
import { RESPONSE_STATUS_LABEL, RESPONSE_STATUS_TONE } from '../../store/assignmentMockData.js';
import { formatDate } from '../../../lib/format.js';
import './template-list.css';

/** Antrian respons yang menunggu keputusan peninjau. */
export default function ReviewQueue() {
  const state = useQuestionnaireState();

  const rows = state.responses
    .filter(awaitsReview)
    .map((response) => ({ response, ...assignmentView(state, response.assignmentId) }))
    .filter((row) => row.version);

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Tinjauan' }]}
        icon="verify"
        title="Tinjauan kuesioner"
        description="Respons pemasok yang menunggu keputusan Anda: setujui, tolak, atau minta revisi."
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Tidak ada yang menunggu ditinjau"
            description="Respons muncul di sini begitu pemasok mengirimkan kuesionernya."
            action={<Button variant="secondary" to="/internal/penugasan">Buka daftar penugasan</Button>}
          />
        </div>
      ) : (
        <div className="card qlist__tablewrap">
          <table className="qtable">
            <caption className="visually-hidden">Antrian tinjauan kuesioner</caption>
            <thead>
              <tr>
                <th scope="col">Pemasok</th>
                <th scope="col">Kuesioner</th>
                <th scope="col">Dikirim</th>
                <th scope="col">Putaran</th>
                <th scope="col">Skor</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ response, assignment, version, template }) => (
                <tr key={response.id}>
                  <th scope="row">
                    <Link to={`/internal/tinjauan/${response.id}`} className="qtable__link">
                      {assignment.supplierName}
                    </Link>
                    <span className="qtable__sub">{assignment.reviewerName}</span>
                  </th>
                  <td>
                    {template.name}
                    <span className="qtable__sub">{version.versionLabel}</span>
                  </td>
                  <td>{formatDate(response.submittedAt)}</td>
                  <td className="qtable__num">{response.revision}</td>
                  <td>
                    <ScorePill score={calculateScore(version, response.answers)} />
                  </td>
                  <td>
                    <span className={`pill pill--${RESPONSE_STATUS_TONE[response.status]}`}>
                      {RESPONSE_STATUS_LABEL[response.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
