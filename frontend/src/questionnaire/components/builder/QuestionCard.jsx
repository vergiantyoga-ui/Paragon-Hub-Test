import Icon from '../../../components/ui/Icon.jsx';
import { QUESTION_TYPES } from '../../engine/index.js';

/**
 * Satu pertanyaan pada kanvas. Menampilkan bentuknya secara ringkas —
 * tipe, kewajiban, kondisi, lampiran — supaya penyusun dapat memindai
 * struktur tanpa membuka panel properti satu per satu.
 */
export default function QuestionCard({
  question,
  index,
  selected,
  readOnly,
  isFirst,
  isLast,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}) {
  const typeLabel = QUESTION_TYPES[question.type]?.label ?? question.type;

  return (
    <li>
      <div
        className={`qcard ${selected ? 'qcard--selected' : ''}`.trim()}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <span className="qcard__index" aria-hidden="true">
          {index + 1}
        </span>

        <div className="qcard__body">
          <p className="qcard__text">
            {question.text || <span className="muted">Pertanyaan tanpa teks</span>}
          </p>
          <p className="qcard__meta">
            {question.code && <span className="qcard__code">{question.code}</span>}
            <span>{typeLabel}</span>
            {question.required && <span className="qcard__flag">wajib</span>}
            {question.conditions && <span className="qcard__flag">bersyarat</span>}
            {question.attachmentRule?.required && <span className="qcard__flag">lampiran</span>}
            {question.weight !== 1 && <span>bobot {question.weight}</span>}
          </p>
        </div>

        {!readOnly && (
          <div className="qcard__actions" onClick={(event) => event.stopPropagation()}>
            <IconButton label="Naikkan pertanyaan" disabled={isFirst} onClick={() => onMove(-1)}>
              <Icon name="chevronUp" size={16} />
            </IconButton>
            <IconButton label="Turunkan pertanyaan" disabled={isLast} onClick={() => onMove(1)}>
              <Icon name="chevronDown" size={16} />
            </IconButton>
            <IconButton label="Duplikat pertanyaan" onClick={onDuplicate}>
              <Icon name="copy" size={16} />
            </IconButton>
            <IconButton label="Hapus pertanyaan" onClick={onDelete} danger>
              <Icon name="trash" size={16} />
            </IconButton>
          </div>
        )}
      </div>
    </li>
  );
}

function IconButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      className={`iconbtn ${danger ? 'iconbtn--danger' : ''}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export { IconButton };
