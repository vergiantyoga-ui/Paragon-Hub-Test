import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import CompletionBar from '../../components/shared/CompletionBar.jsx';
import { useQuestionnaireState, assignmentsForSupplier } from '../../store/QuestionnaireStore.jsx';
import { useCurrentSubmission } from '../../../store/AppStore.jsx';
import { calculateCompletion, RESPONSE_STATUS } from '../../engine/index.js';
import { RESPONSE_STATUS_LABEL, RESPONSE_STATUS_TONE } from '../../store/assignmentMockData.js';
import { formatDate, daysFromNow } from '../../../lib/format.js';
import './supplier-questionnaire.css';

/**
 * Daftar kuesioner yang ditugaskan kepada pemasok yang sedang masuk.
 * Tenggat yang lewat ditandai jelas, karena inilah alasan utama pemasok
 * membuka halaman ini.
 */
export default function MyQuestionnaires() {
  const state = useQuestionnaireState();
  const submission = useCurrentSubmission();

  const rows = assignmentsForSupplier(state, submission.id).filter((row) => row.version);

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/portal/status' }, { label: 'Kuesioner' }]}
        icon="consent"
        title="Kuesioner"
        description="Kuesioner yang ditugaskan tim procurement Paragon kepada perusahaan Anda."
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Belum ada kuesioner yang ditugaskan"
            description="Bila tim procurement menugaskan kuesioner, daftarnya muncul di halaman ini beserta tenggatnya."
          />
        </div>
      ) : (
        <ul className="qlist">
          {rows.map(({ assignment, response, version, template }) => {
            const completion = calculateCompletion(
              version,
              response?.answers ?? {},
              response?.attachments ?? {},
            );
            const remaining = daysFromNow(assignment.dueDate);
            const overdue = remaining < 0 && response?.status !== RESPONSE_STATUS.SUBMITTED;
            const openable = response?.status !== RESPONSE_STATUS.SUBMITTED;

            return (
              <li key={assignment.id}>
                <article className="qrow">
                  <div className="qrow__main">
                    <div className="qrow__head">
                      <h2 className="qrow__title">
                        {openable ? (
                          <Link to={`/portal/kuesioner/${response.id}`}>{template.name}</Link>
                        ) : (
                          template.name
                        )}
                      </h2>
                      <span
                        className={`pill pill--${RESPONSE_STATUS_TONE[response?.status] ?? 'neutral'}`}
                      >
                        {RESPONSE_STATUS_LABEL[response?.status] ?? 'Belum dimulai'}
                      </span>
                    </div>

                    <p className="qrow__meta">
                      {template.type} · {version.versionLabel} · ditugaskan{' '}
                      {formatDate(assignment.assignedAt)} oleh {assignment.assignedBy}
                    </p>

                    {assignment.materialName && (
                      <p className="qrow__meta">Material: {assignment.materialName}</p>
                    )}

                    <p className={`qrow__due ${overdue ? 'qrow__due--late' : ''}`.trim()}>
                      Tenggat {formatDate(assignment.dueDate)}
                      {overdue
                        ? ` · terlambat ${Math.abs(remaining)} hari`
                        : remaining <= 7 && response?.status !== RESPONSE_STATUS.SUBMITTED
                          ? ` · tersisa ${remaining} hari`
                          : ''}
                    </p>
                  </div>

                  <div className="qrow__side">
                    <CompletionBar
                      percent={completion.percent}
                      label={`Kemajuan ${template.name}`}
                    />
                    {openable && (
                      <Link className="btn btn--primary btn--sm" to={`/portal/kuesioner/${response.id}`}>
                        {response?.status === RESPONSE_STATUS.NOT_STARTED ? 'Mulai isi' : 'Lanjutkan'}
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
