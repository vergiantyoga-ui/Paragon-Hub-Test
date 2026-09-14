import Icon from '../../../components/ui/Icon.jsx';
import QuestionCard, { IconButton } from './QuestionCard.jsx';

/**
 * Satu seksi pada kanvas beserta pertanyaannya.
 * Seksi dapat dilipat agar kuesioner panjang tetap dapat dipindai.
 */
export default function SectionCard({
  section,
  index,
  collapsed,
  selected,
  selectedQuestionId,
  readOnly,
  isFirst,
  isLast,
  onToggle,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onSelectQuestion,
  onMoveQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
}) {
  const panelId = `section-panel-${section.id}`;

  return (
    <section className={`seccard ${selected ? 'seccard--selected' : ''}`.trim()}>
      <header className="seccard__head">
        <button
          type="button"
          className="seccard__toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronDown'} size={18} />
        </button>

        <button type="button" className="seccard__title" onClick={onSelect}>
          <span className="seccard__index">Seksi {index + 1}</span>
          <span className="seccard__name">{section.name || 'Seksi tanpa nama'}</span>
          <span className="seccard__meta">
            {section.questions.length} pertanyaan
            {!section.mandatory && ' · opsional'}
            {section.weight !== 1 && ` · bobot ${section.weight}`}
          </span>
        </button>

        {!readOnly && (
          <div className="seccard__actions">
            <IconButton label="Naikkan seksi" disabled={isFirst} onClick={() => onMove(-1)}>
              <Icon name="chevronUp" size={16} />
            </IconButton>
            <IconButton label="Turunkan seksi" disabled={isLast} onClick={() => onMove(1)}>
              <Icon name="chevronDown" size={16} />
            </IconButton>
            <IconButton label="Duplikat seksi" onClick={onDuplicate}>
              <Icon name="copy" size={16} />
            </IconButton>
            <IconButton label="Hapus seksi" onClick={onDelete} danger>
              <Icon name="trash" size={16} />
            </IconButton>
          </div>
        )}
      </header>

      {!collapsed && (
        <div id={panelId} className="seccard__body">
          {section.description && <p className="seccard__desc">{section.description}</p>}

          {section.questions.length === 0 ? (
            <p className="seccard__empty">
              Belum ada pertanyaan. Pilih tipe soal pada kotak perkakas di kiri.
            </p>
          ) : (
            <ol className="seccard__questions">
              {section.questions.map((question, qIndex) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={qIndex}
                  selected={selectedQuestionId === question.id}
                  readOnly={readOnly}
                  isFirst={qIndex === 0}
                  isLast={qIndex === section.questions.length - 1}
                  onSelect={() => onSelectQuestion(question.id)}
                  onMove={(direction) => onMoveQuestion(question.id, direction)}
                  onDuplicate={() => onDuplicateQuestion(question.id)}
                  onDelete={() => onDeleteQuestion(question)}
                />
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
