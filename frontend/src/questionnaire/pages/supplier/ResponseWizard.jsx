import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import QuestionRenderer from '../../components/render/QuestionRenderer.jsx';
import CompletionBar from '../../components/shared/CompletionBar.jsx';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
  assignmentView,
} from '../../store/QuestionnaireStore.jsx';
import {
  RESPONSE_STATUS,
  calculateCompletion,
  canSupplierEdit,
  commentsFor,
  latestReview,
  questionsNeedingRevision,
  revisionBlockers,
  emptyAnswersFor,
  isVersionExpired,
  pruneHiddenAnswers,
  submissionBlockers,
  validateResponse,
  visibleQuestionsOf,
} from '../../engine/index.js';
import { useCurrentSubmission } from '../../../store/AppStore.jsx';
import { formatDate } from '../../../lib/format.js';
import './supplier-questionnaire.css';

/**
 * Wizard pengisian kuesioner.
 *
 * Jawaban disimpan di state lokal selama pengisian dan didorong ke store saat
 * menyimpan draf, berpindah seksi, atau meninggalkan halaman. Pertanyaan
 * bersyarat muncul dan hilang seketika, dan jawaban pada cabang yang menjadi
 * tersembunyi dibuang supaya tidak ikut terkirim.
 */
export default function ResponseWizard() {
  const { responseId } = useParams();
  const state = useQuestionnaireState();
  const actions = useQuestionnaireActions();
  const submission = useCurrentSubmission();
  const toast = useToast();
  const navigate = useNavigate();

  const response = state.responses.find((item) => item.id === responseId);
  const view = response ? assignmentView(state, response.assignmentId) : null;

  const [answers, setAnswers] = useState(() => ({
    ...(view?.version ? emptyAnswersFor(view.version) : {}),
    ...(response?.answers ?? {}),
  }));
  const [attachments, setAttachments] = useState(response?.attachments ?? {});
  const [stepIndex, setStepIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Menandai mulai mengisi hanya sekali, saat kuesioner pertama kali dibuka.
  useEffect(() => {
    if (response?.status === RESPONSE_STATUS.NOT_STARTED) {
      actions.startResponse(response.id, submission?.contact.name ?? 'Pemasok');
    }
    // Sengaja hanya bergantung pada id: menjalankannya ulang saat status berubah
    // akan menimpa waktu mulai yang sudah tercatat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response?.id]);

  if (!response || !view?.version) return <Navigate to="/portal/kuesioner" replace />;

  // Kuesioner yang sedang ditinjau atau sudah selesai tidak dapat dibuka lagi.
  const closed = [
    RESPONSE_STATUS.SUBMITTED,
    RESPONSE_STATUS.UNDER_REVIEW,
    RESPONSE_STATUS.APPROVED,
    RESPONSE_STATUS.REJECTED,
  ].includes(response.status);
  if (closed) return <Navigate to="/portal/kuesioner" replace />;

  const { version, template, assignment } = view;
  const expired = isVersionExpired(version);

  // Mode revisi: hanya pertanyaan bertanda peninjau yang boleh disunting,
  // dan pengiriman ulang menuntut semuanya benar-benar berubah.
  const inRevision = response.status === RESPONSE_STATUS.REVISION_REQUIRED;
  const needsFix = questionsNeedingRevision(response);
  const review = latestReview(response);
  const pendingFixes = inRevision
    ? revisionBlockers({ ...response, answers, attachments }, version)
    : [];
  const completion = calculateCompletion(version, answers, attachments);
  const errors = validateResponse(version, answers, attachments);
  const section = version.sections[stepIndex];
  const visible = visibleQuestionsOf(section, answers);
  const isLast = stepIndex === version.sections.length - 1;

  function persist(nextAnswers = answers, nextAttachments = attachments) {
    // Jawaban pada cabang yang tersembunyi tidak ikut disimpan.
    const cleaned = pruneHiddenAnswers(version, nextAnswers);
    actions.saveDraft(response.id, cleaned, nextAttachments);
    setSavedAt(new Date());
  }

  function setAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function setFiles(questionId, files) {
    setAttachments((current) => ({ ...current, [questionId]: files }));
  }

  function goToStep(index) {
    persist();
    setStepIndex(index);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit() {
    if (submissionBlockers(version, answers, attachments).length > 0 || pendingFixes.length > 0) {
      setShowErrors(true);
    }
    setConfirming(true);
  }

  function confirmSubmit() {
    persist();
    actions.submitResponse(response.id, submission?.contact.name ?? 'Pemasok');
    setConfirming(false);
    toast.success('Kuesioner terkirim ke tim procurement.');
    navigate('/portal/kuesioner');
  }

  const blockers = submissionBlockers(version, answers, attachments);
  const allBlockers = [
    ...blockers,
    ...pendingFixes.map((fix) => ({
      questionId: fix.questionId,
      sectionName: 'Perlu perbaikan',
      questionText: fix.comment,
      message: 'Jawaban ini belum berubah sejak diminta revisi.',
    })),
  ];

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/portal/status' },
          { label: 'Kuesioner', to: '/portal/kuesioner' },
          { label: template.name },
        ]}
        icon="consent"
        title={template.name}
        description={`${version.versionLabel} · tenggat ${formatDate(assignment.dueDate)}${
          version.estimatedMinutes ? ` · perkiraan ${version.estimatedMinutes} menit` : ''
        }`}
        actions={<CompletionBar percent={completion.percent} label="Kemajuan keseluruhan" />}
      />

      {expired && (
        <div className="notice notice--danger" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">Kuesioner ini sudah kedaluwarsa</span>
          Masa berlaku versi ini berakhir {formatDate(version.expiryDate)}. Hubungi tim
          procurement untuk memperoleh penugasan versi terbaru.
        </div>
      )}

      {inRevision && (
        <div className="notice notice--danger" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">
            {needsFix.size} pertanyaan perlu diperbaiki
          </span>
          {review?.note || 'Peninjau menandai sebagian jawaban Anda. Hanya pertanyaan bertanda yang dapat disunting.'}
        </div>
      )}

      {assignment.instructions && (
        <div className="notice notice--info" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">Catatan dari tim procurement</span>
          {assignment.instructions}
        </div>
      )}

      <div className="wizard">
        <nav className="wizard__nav" aria-label="Bagian kuesioner">
          <ul className="wizard__steps">
            {version.sections.map((item, index) => {
              const sectionState = completion.sections.find((s) => s.sectionId === item.id);
              const done = sectionState?.complete;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`wizard__step ${done ? 'wizard__step--done' : ''}`.trim()}
                    aria-current={index === stepIndex ? 'step' : undefined}
                    onClick={() => goToStep(index)}
                  >
                    <span className="wizard__mark" aria-hidden="true">
                      {done ? '✓' : index + 1}
                    </span>
                    <span className="wizard__stepname">
                      {item.name}
                      <span className="wizard__stepcount">
                        {' '}
                        {sectionState?.requiredAnswered ?? 0}/{sectionState?.requiredTotal ?? 0}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <CompletionBar percent={completion.percent} label="Kemajuan keseluruhan" />

          <p className="text-xs muted" style={{ marginTop: 'var(--sp-3)' }}>
            {completion.requiredAnswered} dari {completion.requiredTotal} pertanyaan wajib terisi.
          </p>
        </nav>

        <div>
          <Card title={section.name} subtitle={section.description || undefined}>
            {visible.length === 0 ? (
              <p className="text-sm muted">
                Tidak ada pertanyaan yang berlaku pada seksi ini berdasarkan jawaban Anda
                sebelumnya.
              </p>
            ) : (
              visible.map((question) => (
                <QuestionRenderer
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  files={attachments[question.id] ?? []}
                  error={showErrors ? errors[question.id] : undefined}
                  readOnly={expired || !canSupplierEdit(response, question.id)}
                  comments={commentsFor(response, question.id)}
                  highlighted={needsFix.has(question.id)}
                  onChange={(value) => setAnswer(question.id, value)}
                  onFilesChange={(files) => setFiles(question.id, files)}
                />
              ))
            )}

            <div className="wizard__actions">
              <div className="row">
                <Button
                  variant="secondary"
                  disabled={stepIndex === 0}
                  onClick={() => goToStep(stepIndex - 1)}
                >
                  <Icon name="chevronLeft" size={16} />
                  Sebelumnya
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    persist();
                    toast.success('Draf tersimpan.');
                  }}
                  disabled={expired}
                >
                  Simpan draf
                </Button>

                {savedAt && (
                  <span className="wizard__saved">
                    Tersimpan {savedAt.toLocaleTimeString('id-ID')}
                  </span>
                )}
              </div>

              {isLast ? (
                <Button onClick={handleSubmit} disabled={expired}>
                  {inRevision ? 'Kirim revisi' : 'Kirim kuesioner'}
                </Button>
              ) : (
                <Button onClick={() => goToStep(stepIndex + 1)}>
                  Berikutnya
                  <Icon name="chevronRight" size={16} />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={allBlockers.length > 0 ? 'Belum dapat dikirim' : inRevision ? 'Kirim revisi?' : 'Kirim kuesioner?'}
        description={
          allBlockers.length > 0
            ? `Kuesioner terisi ${completion.percent}%. Lengkapi hal berikut terlebih dahulu.`
            : `Kuesioner terisi ${completion.percent}%. Setelah dikirim, jawaban tidak dapat diubah kecuali tim procurement meminta revisi.`
        }
        footer={
          allBlockers.length > 0 ? (
            <Button onClick={() => setConfirming(false)}>Kembali melengkapi</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Batal
              </Button>
              <Button onClick={confirmSubmit}>Kirim sekarang</Button>
            </>
          )
        }
      >
        {allBlockers.length > 0 && (
          <ul className="stack-sm" style={{ margin: 0, paddingLeft: '1.1em' }}>
            {allBlockers.map((blocker) => (
              <li key={blocker.questionId} className="text-sm">
                <strong>{blocker.sectionName}</strong> — {blocker.questionText}
                <br />
                <span className="muted">{blocker.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
