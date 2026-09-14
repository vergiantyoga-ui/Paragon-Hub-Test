import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAppState } from '../../../store/AppStore.jsx';
import QuestionToolbox from '../../components/builder/QuestionToolbox.jsx';
import SectionCard from '../../components/builder/SectionCard.jsx';
import PropertiesPanel from '../../components/builder/PropertiesPanel.jsx';
import ScoringPanel from '../../components/builder/ScoringPanel.jsx';
import LibraryPicker from '../../components/builder/LibraryPicker.jsx';
import QuestionnaireStatusBadge from '../../components/shared/QuestionnaireStatusBadge.jsx';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
} from '../../store/QuestionnaireStore.jsx';
import {
  canEdit,
  countQuestions,
  countSections,
  findQuestion,
  publishBlockers,
} from '../../engine/index.js';
import './builder.css';

/**
 * Builder questionnaire.
 *
 * Tiga kolom: perkakas, kanvas, properti. Versi yang sudah terbit dibuka
 * dalam mode baca — tombol penyuntingan tidak ditampilkan, dan store tetap
 * menolak perubahan seandainya ada jalan lain menuju aksi itu.
 */
export default function QuestionnaireBuilder() {
  const { templateId, versionId } = useParams();
  const { templates, versions, questionLibrary, sectionLibrary } = useQuestionnaireState();
  const actions = useQuestionnaireActions();
  const { session } = useAppState();
  const toast = useToast();

  const [selection, setSelection] = useState(null); // { kind, sectionId, questionId }
  const [collapsed, setCollapsed] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [showBlockers, setShowBlockers] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [library, setLibrary] = useState(null); // 'question' | 'section'

  const template = templates.find((item) => item.id === templateId);
  const version = versions.find((item) => item.id === versionId);

  if (!template || !version) return <Navigate to="/internal/questionnaire" replace />;

  const readOnly = !canEdit(version);
  const actor = session?.user;
  const blockers = publishBlockers(version);

  /* --------------------------- Pembantu --------------------------- */

  const activeSectionId =
    selection?.kind === 'section'
      ? selection.sectionId
      : selection?.kind === 'question'
        ? selection.sectionId
        : null;

  const activeSection = version.sections.find((section) => section.id === activeSectionId);

  const resolvedSelection = (() => {
    if (!selection) return null;
    if (selection.kind === 'section') {
      const section = version.sections.find((item) => item.id === selection.sectionId);
      return section ? { kind: 'section', section } : null;
    }
    const found = findQuestion(version, selection.questionId);
    return found ? { kind: 'question', ...found } : null;
  })();

  /** Membungkus aksi store agar pesan penolakan selalu sampai ke pengguna. */
  function run(result, successMessage) {
    if (!result?.ok) {
      toast.error(result?.message ?? 'Perubahan tidak dapat diterapkan.');
      return null;
    }
    if (successMessage) toast.success(successMessage);
    return result.version;
  }

  /* ---------------------------- Seksi ----------------------------- */

  function handleAddSection() {
    const next = run(actions.addSection(version.id, actor));
    if (!next) return;
    const added = next.sections[next.sections.length - 1];
    setSelection({ kind: 'section', sectionId: added.id });
  }

  function handleDeleteSection(section) {
    setConfirming({
      kind: 'section',
      title: 'Hapus seksi ini?',
      description:
        section.questions.length > 0
          ? `"${section.name}" berisi ${section.questions.length} pertanyaan yang ikut terhapus. Kondisi yang merujuk pertanyaan tersebut akan dikosongkan.`
          : `"${section.name}" akan dihapus.`,
      onConfirm: () => {
        run(actions.deleteSection(version.id, section.id, actor), 'Seksi dihapus.');
        setSelection(null);
      },
    });
  }

  /* -------------------------- Pertanyaan -------------------------- */

  function handleAddQuestion(typeId) {
    if (!activeSection) return;
    const next = run(actions.addQuestion(version.id, activeSection.id, typeId, actor));
    if (!next) return;

    const section = next.sections.find((item) => item.id === activeSection.id);
    const added = section.questions[section.questions.length - 1];
    setSelection({ kind: 'question', sectionId: section.id, questionId: added.id });
  }

  function handleDeleteQuestion(section, question) {
    setConfirming({
      kind: 'question',
      title: 'Hapus pertanyaan ini?',
      description: question.text
        ? `"${question.text}" akan dihapus. Kondisi pada pertanyaan lain yang merujuknya akan dikosongkan.`
        : 'Pertanyaan ini akan dihapus.',
      onConfirm: () => {
        run(actions.deleteQuestion(version.id, question.id, actor), 'Pertanyaan dihapus.');
        setSelection({ kind: 'section', sectionId: section.id });
      },
    });
  }

  /* --------------------------- Terbitkan -------------------------- */

  function handlePublish() {
    if (blockers.length > 0) {
      setShowBlockers(true);
      return;
    }
    const result = actions.publishVersion(version.id, actor);
    if (result.ok) toast.success(`${version.versionLabel} diterbitkan.`);
    else toast.error(result.message);
  }

  /* ---------------------------- Render ---------------------------- */

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Questionnaire', to: '/internal/questionnaire' },
          { label: template.name, to: `/internal/questionnaire/${template.id}` },
          { label: version.versionLabel },
        ]}
        icon="document"
        title={template.name}
        description={`${countSections(version)} seksi · ${countQuestions(version)} pertanyaan${
          version.scoringEnabled ? ' · skoring aktif' : ''
        }`}
        actions={
          <div className="row">
            <QuestionnaireStatusBadge status={version.status} />
            {!readOnly && (
              <>
                <Button variant="secondary" onClick={() => setShowScoring(true)}>
                  Pengaturan skoring
                </Button>
                <Button onClick={handlePublish} disabled={blockers.length > 0}>
                  Terbitkan
                </Button>
              </>
            )}
          </div>
        }
      />

      {readOnly && (
        <div className="notice notice--info" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">Mode baca</span>
          Versi yang sudah terbit tidak dapat disunting. Buat versi baru dari halaman detail
          bila ada perubahan yang diperlukan.
        </div>
      )}

      {!readOnly && blockers.length > 0 && (
        <div className="notice notice--warn" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">
            {blockers.length} hal perlu dibereskan sebelum terbit
          </span>
          <button type="button" className="link-btn" onClick={() => setShowBlockers(true)}>
            Lihat daftarnya
          </button>
        </div>
      )}

      <div className={`builder ${readOnly ? 'builder--readonly' : ''}`.trim()}>
        {!readOnly && (
          <QuestionToolbox
            onAddSection={handleAddSection}
            onAddQuestion={handleAddQuestion}
            targetSectionName={activeSection?.name || (activeSection ? 'seksi terpilih' : null)}
            onPickSection={() => setLibrary('section')}
            onPickQuestion={() => setLibrary('question')}
          />
        )}

        <div className="builder__canvas">
          {version.sections.length === 0 ? (
            <div className="card">
              <EmptyState
                title="Kuesioner ini belum berisi seksi"
                description="Mulai dengan menambahkan satu seksi, lalu isi dengan pertanyaan dari kotak perkakas."
                action={
                  readOnly ? null : <Button onClick={handleAddSection}>Tambah seksi pertama</Button>
                }
              />
            </div>
          ) : (
            version.sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                collapsed={Boolean(collapsed[section.id])}
                selected={activeSectionId === section.id}
                selectedQuestionId={
                  selection?.kind === 'question' ? selection.questionId : null
                }
                readOnly={readOnly}
                isFirst={index === 0}
                isLast={index === version.sections.length - 1}
                onToggle={() =>
                  setCollapsed((current) => ({ ...current, [section.id]: !current[section.id] }))
                }
                onSelect={() => setSelection({ kind: 'section', sectionId: section.id })}
                onMove={(direction) =>
                  run(actions.moveSection(version.id, section.id, direction, actor))
                }
                onDuplicate={() =>
                  run(actions.duplicateSection(version.id, section.id, actor), 'Seksi diduplikat.')
                }
                onDelete={() => handleDeleteSection(section)}
                onSelectQuestion={(questionId) =>
                  setSelection({ kind: 'question', sectionId: section.id, questionId })
                }
                onMoveQuestion={(questionId, direction) =>
                  run(actions.moveQuestion(version.id, section.id, questionId, direction, actor))
                }
                onDuplicateQuestion={(questionId) =>
                  run(
                    actions.duplicateQuestion(version.id, section.id, questionId, actor),
                    'Pertanyaan diduplikat.',
                  )
                }
                onDeleteQuestion={(question) => handleDeleteQuestion(section, question)}
              />
            ))
          )}
        </div>

        <PropertiesPanel
          version={version}
          selection={resolvedSelection}
          readOnly={readOnly}
          onUpdateSection={(patch) =>
            run(actions.updateSection(version.id, resolvedSelection.section.id, patch, actor))
          }
          onUpdateQuestion={(patch) =>
            run(actions.updateQuestion(version.id, resolvedSelection.question.id, patch, actor))
          }
          onChangeType={(typeId) =>
            run(actions.changeQuestionType(version.id, resolvedSelection.question.id, typeId, actor))
          }
        />
      </div>

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming?.title ?? ''}
        description={confirming?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                confirming.onConfirm();
                setConfirming(null);
              }}
            >
              Hapus
            </Button>
          </>
        }
      />

      <Modal
        open={showScoring}
        onClose={() => setShowScoring(false)}
        title="Pengaturan skoring"
        description="Berlaku untuk seluruh kuesioner pada versi ini."
        footer={<Button onClick={() => setShowScoring(false)}>Selesai</Button>}
      >
        <ScoringPanel
          version={version}
          readOnly={readOnly}
          onUpdate={(patch) => run(actions.updateVersionSettings(version.id, patch, actor))}
          onUpdateBand={(bandId, patch) =>
            run(actions.updateRiskBand(version.id, bandId, patch, actor))
          }
        />
      </Modal>

      <LibraryPicker
        open={Boolean(library)}
        mode={library ?? 'question'}
        questionLibrary={questionLibrary}
        sectionLibrary={sectionLibrary}
        onClose={() => setLibrary(null)}
        onPickSection={(sectionTemplate) => {
          const next = run(
            actions.addSectionFromLibrary(version.id, sectionTemplate, actor),
            `Seksi "${sectionTemplate.name}" ditambahkan.`,
          );
          if (next) {
            const added = next.sections[next.sections.length - 1];
            setSelection({ kind: 'section', sectionId: added.id });
          }
          setLibrary(null);
        }}
        onPickQuestion={(item) => {
          if (!activeSection) return;
          run(
            actions.addFromLibrary(version.id, activeSection.id, item, actor),
            'Pertanyaan ditambahkan dari pustaka.',
          );
          setLibrary(null);
        }}
      />

      <Modal
        open={showBlockers}
        onClose={() => setShowBlockers(false)}
        title="Belum layak terbit"
        description="Hal berikut perlu dibereskan lebih dahulu."
        footer={<Button onClick={() => setShowBlockers(false)}>Mengerti</Button>}
      >
        <ul className="stack-sm" style={{ margin: 0, paddingLeft: '1.1em' }}>
          {blockers.map((problem) => (
            <li key={problem} className="text-sm">
              {problem}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
