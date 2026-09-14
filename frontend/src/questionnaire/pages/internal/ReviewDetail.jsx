import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import DataList from '../../../components/ui/DataList.jsx';
import { TextAreaField, Checkbox } from '../../../components/ui/Field.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAppState } from '../../../store/AppStore.jsx';
import ScorePill from '../../components/shared/ScorePill.jsx';
import CompletionBar from '../../components/shared/CompletionBar.jsx';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
  assignmentView,
} from '../../store/QuestionnaireStore.jsx';
import {
  REVIEW_DECISION,
  RESPONSE_STATUS,
  calculateCompletion,
  calculateScore,
  commentsFor,
  getType,
  visibleQuestionsOf,
} from '../../engine/index.js';
import { RESPONSE_STATUS_LABEL, RESPONSE_STATUS_TONE } from '../../store/assignmentMockData.js';
import { formatBytes } from '../../../lib/validation.js';
import { formatDate, formatDateTime } from '../../../lib/format.js';
import './review.css';

/**
 * Layar tinjauan satu respons.
 *
 * Peninjau menandai pertanyaan yang perlu diperbaiki satu per satu beserta
 * alasannya. Penandaan itulah yang kelak membatasi apa yang boleh disunting
 * pemasok saat revisi, jadi menandai tanpa alasan tidak diizinkan.
 */
export default function ReviewDetail() {
  const { responseId } = useParams();
  const state = useQuestionnaireState();
  const actions = useQuestionnaireActions();
  const { session } = useAppState();
  const toast = useToast();
  const navigate = useNavigate();

  const [flags, setFlags] = useState({}); // questionId → komentar
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(null);

  const response = state.responses.find((item) => item.id === responseId);
  const view = response ? assignmentView(state, response.assignmentId) : null;

  if (!response || !view?.version) return <Navigate to="/internal/tinjauan" replace />;

  const { version, template, assignment } = view;
  const actor = session?.user;
  const score = calculateScore(version, response.answers);
  const completion = calculateCompletion(version, response.answers, response.attachments);
  const settled =
    response.status === RESPONSE_STATUS.APPROVED || response.status === RESPONSE_STATUS.REJECTED;
  const flaggedCount = Object.keys(flags).length;
  const missingReason = Object.values(flags).some((comment) => !comment.trim());

  function toggleFlag(questionId, checked) {
    setFlags((current) => {
      const next = { ...current };
      if (checked) next[questionId] = next[questionId] ?? '';
      else delete next[questionId];
      return next;
    });
  }

  function submitDecision() {
    if (decision === REVIEW_DECISION.REJECT && note.trim().length < 15) {
      setNoteError('Jelaskan alasan penolakan agar pemasok memahaminya.');
      return;
    }

    const result = actions.decideReview(
      response.id,
      {
        decision,
        note: note.trim(),
        flagged:
          decision === REVIEW_DECISION.REVISION
            ? Object.entries(flags).map(([questionId, comment]) => ({ questionId, comment: comment.trim() }))
            : [],
      },
      actor,
    );

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(
      decision === REVIEW_DECISION.APPROVE
        ? 'Kuesioner disetujui.'
        : decision === REVIEW_DECISION.REJECT
          ? 'Kuesioner ditolak.'
          : 'Permintaan revisi dikirim ke pemasok.',
    );
    navigate('/internal/tinjauan');
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Tinjauan', to: '/internal/tinjauan' },
          { label: assignment.supplierName },
        ]}
        icon="verify"
        title={template.name}
        description={`${assignment.supplierName} · ${version.versionLabel} · putaran ${response.revision}`}
        actions={
          <span className={`pill pill--${RESPONSE_STATUS_TONE[response.status] ?? 'neutral'}`}>
            {RESPONSE_STATUS_LABEL[response.status]}
          </span>
        }
      />

      <div className="review">
        <div className="stack-lg">
          {version.sections.map((section) => {
            const questions = visibleQuestionsOf(section, response.answers);
            if (questions.length === 0) return null;

            return (
              <Card key={section.id} title={section.name} subtitle={section.description || undefined}>
                {questions.map((question) => (
                  <AnswerRow
                    key={question.id}
                    question={question}
                    value={response.answers[question.id]}
                    files={response.attachments[question.id] ?? []}
                    history={commentsFor(response, question.id)}
                    flagged={question.id in flags}
                    comment={flags[question.id] ?? ''}
                    editable={!settled}
                    onToggleFlag={(checked) => toggleFlag(question.id, checked)}
                    onComment={(text) =>
                      setFlags((current) => ({ ...current, [question.id]: text }))
                    }
                  />
                ))}
              </Card>
            );
          })}
        </div>

        <aside className="review__side">
          <Card title="Ringkasan">
            <DataList
              items={[
                { label: 'Pemasok', value: assignment.supplierName, full: true },
                { label: 'Lokasi', value: assignment.supplierSite, full: true },
                { label: 'Material', value: assignment.materialName || assignment.materialCategory },
                { label: 'Dikirim', value: formatDate(response.submittedAt) },
                { label: 'Tenggat', value: formatDate(assignment.dueDate) },
                { label: 'Putaran', value: `ke-${response.revision}` },
              ]}
            />

            <div style={{ marginTop: 'var(--sp-4)' }}>
              <p className="text-xs muted">Skor</p>
              <ScorePill score={score} />
            </div>

            <div style={{ marginTop: 'var(--sp-4)' }}>
              <p className="text-xs muted" style={{ marginBottom: 4 }}>
                Kelengkapan
              </p>
              <CompletionBar percent={completion.percent} label="Kelengkapan jawaban" />
            </div>
          </Card>

          {!settled && (
            <Card title="Keputusan">
              {flaggedCount > 0 && (
                <div className="notice notice--warn" style={{ marginBottom: 'var(--sp-4)' }}>
                  {flaggedCount} pertanyaan ditandai perlu perbaikan.
                  {missingReason && ' Lengkapi alasannya sebelum meminta revisi.'}
                </div>
              )}

              <div className="stack-sm">
                <Button
                  block
                  variant="success"
                  disabled={flaggedCount > 0}
                  onClick={() => setDecision(REVIEW_DECISION.APPROVE)}
                >
                  Setujui
                </Button>
                <Button
                  block
                  variant="secondary"
                  disabled={flaggedCount === 0 || missingReason}
                  onClick={() => setDecision(REVIEW_DECISION.REVISION)}
                >
                  Minta revisi
                </Button>
                <Button
                  block
                  variant="danger"
                  onClick={() => setDecision(REVIEW_DECISION.REJECT)}
                >
                  Tolak
                </Button>
              </div>

              {flaggedCount === 0 && (
                <p className="field__hint" style={{ marginTop: 'var(--sp-3)' }}>
                  Tandai pertanyaan pada daftar jawaban untuk meminta revisi.
                </p>
              )}
            </Card>
          )}

          {(response.reviews ?? []).length > 0 && (
            <Card title="Riwayat tinjauan">
              <ul className="timeline">
                {[...response.reviews].reverse().map((review) => (
                  <li key={review.id}>
                    <span>
                      Putaran {review.revision} —{' '}
                      {review.decision === REVIEW_DECISION.APPROVE
                        ? 'disetujui'
                        : review.decision === REVIEW_DECISION.REJECT
                          ? 'ditolak'
                          : `revisi diminta (${review.flagged.length} pertanyaan)`}
                    </span>
                    {review.note && <span className="text-sm muted">{review.note}</span>}
                    <time dateTime={review.decidedAt}>
                      {formatDateTime(review.decidedAt)} · {review.reviewerName}
                    </time>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <Modal
        open={Boolean(decision)}
        onClose={() => {
          setDecision(null);
          setNoteError(null);
        }}
        title={
          decision === REVIEW_DECISION.APPROVE
            ? 'Setujui kuesioner ini?'
            : decision === REVIEW_DECISION.REJECT
              ? 'Tolak kuesioner ini?'
              : 'Kirim permintaan revisi?'
        }
        description={
          decision === REVIEW_DECISION.REVISION
            ? `Pemasok hanya dapat menyunting ${flaggedCount} pertanyaan yang Anda tandai. Jawaban lain tetap terkunci.`
            : decision === REVIEW_DECISION.REJECT
              ? 'Pemasok tidak dapat mengirim ulang setelah ditolak. Gunakan permintaan revisi bila hanya sebagian yang perlu diperbaiki.'
              : 'Kuesioner akan ditandai selesai dan skornya tercatat pada profil pemasok.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecision(null)}>
              Batal
            </Button>
            <Button onClick={submitDecision}>Konfirmasi</Button>
          </>
        }
      >
        <TextAreaField
          label={decision === REVIEW_DECISION.REJECT ? 'Alasan penolakan' : 'Catatan untuk pemasok'}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={noteError}
          hint={decision === REVIEW_DECISION.REJECT ? undefined : 'Opsional.'}
        />
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */

function AnswerRow({
  question,
  value,
  files,
  history,
  flagged,
  comment,
  editable,
  onToggleFlag,
  onComment,
}) {
  const type = getType(question.type);

  return (
    <div className={`answer ${flagged ? 'answer--flagged' : ''}`.trim()}>
      <div className="answer__head">
        <p className="answer__question">
          {question.code && <span className="answer__code">{question.code}</span>}
          {question.text}
        </p>
      </div>

      <p className="answer__value">{renderValue(question, value, type)}</p>

      {files.length > 0 && (
        <ul className="answer__files">
          {files.map((file) => (
            <li key={file.id}>
              {file.fileName} <span className="muted">({formatBytes(file.fileSize)})</span>
              {file.expiryDate && (
                <span className="muted"> · berlaku sampai {formatDate(file.expiryDate)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div className="answer__history">
          {history.map((item, index) => (
            <p key={index} className="text-xs">
              <strong>Putaran {item.revision}</strong> · {item.reviewer}: {item.comment}
            </p>
          ))}
        </div>
      )}

      {editable && (
        <div className="answer__review">
          <Checkbox checked={flagged} onChange={onToggleFlag}>
            <span className="text-sm">Perlu diperbaiki</span>
          </Checkbox>

          {flagged && (
            <textarea
              className="textarea answer__comment"
              rows={2}
              value={comment}
              onChange={(event) => onComment(event.target.value)}
              placeholder="Jelaskan apa yang harus diperbaiki pemasok."
              aria-label={`Alasan perbaikan untuk ${question.text}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Menerjemahkan nilai jawaban menjadi teks yang terbaca peninjau. */
function renderValue(question, value, type) {
  if (type.answerIsAttachment) return 'Lihat dokumen terlampir di bawah.';
  if (question.type === 'statement') return '—';
  if (question.type === 'signature') return value?.dataUrl ? 'Sudah ditandatangani' : 'Belum ditandatangani';

  if (value === null || value === undefined || value === '') return 'Belum dijawab';

  if (Array.isArray(value)) {
    const labels = value.map(
      (item) => question.options.find((option) => option.value === item)?.label ?? item,
    );
    return labels.join(', ');
  }

  if (question.options?.length) {
    return question.options.find((option) => option.value === value)?.label ?? String(value);
  }

  if (typeof value === 'object') return `${value.from ?? '—'} sampai ${value.to ?? '—'}`;

  return String(value);
}
