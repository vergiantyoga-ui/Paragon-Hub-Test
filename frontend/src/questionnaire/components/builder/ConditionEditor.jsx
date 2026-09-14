import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { IconButton } from './QuestionCard.jsx';
import { eligibleTriggers } from '../../engine/index.js';

/**
 * Editor kondisi tampil.
 *
 * Kondisi disimpan sebagai pohon `{all}` atau `{any}` berisi daun
 * `{questionId, operator, value}`. Antarmuka ini sengaja hanya menyediakan
 * satu tingkat: sekumpulan aturan yang digabung dengan "semua" atau "salah
 * satu". Pohon bersarang memang didukung mesin, tetapi menyusunnya lewat
 * antarmuka jarang terpakai dan mudah membingungkan.
 *
 * Pemicu dibatasi pada pertanyaan yang berada sebelumnya, sehingga acuan
 * melingkar tidak mungkin tersusun sejak awal.
 */

const OPERATORS = [
  { id: 'equals', label: 'sama dengan', needsValue: true },
  { id: 'notEquals', label: 'tidak sama dengan', needsValue: true },
  { id: 'in', label: 'termasuk salah satu', needsValue: true, multiple: true },
  { id: 'answered', label: 'sudah dijawab', needsValue: false },
  { id: 'notAnswered', label: 'belum dijawab', needsValue: false },
];

export default function ConditionEditor({ version, question, readOnly, onUpdate }) {
  const triggers = eligibleTriggers(version, question.id);
  const conditions = question.conditions;
  const mode = conditions?.any ? 'any' : 'all';
  const rules = conditions ? (conditions[mode] ?? []) : [];

  function write(nextRules, nextMode = mode) {
    if (nextRules.length === 0) {
      onUpdate({ conditions: null });
      return;
    }
    onUpdate({ conditions: { [nextMode]: nextRules } });
  }

  function addRule() {
    const first = triggers[0];
    if (!first) return;
    write([
      ...rules,
      {
        questionId: first.question.id,
        operator: 'equals',
        value: first.question.options[0]?.value ?? '',
      },
    ]);
  }

  if (triggers.length === 0) {
    return (
      <div className="props__block">
        <h3 className="props__subtitle">Kondisi tampil</h3>
        <p className="props__note" style={{ marginTop: 0 }}>
          Belum ada pertanyaan berpilihan sebelum pertanyaan ini yang dapat dijadikan
          pemicu. Tambahkan pertanyaan ya/tidak atau pilihan di atasnya terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="props__block">
      <h3 className="props__subtitle">Kondisi tampil</h3>

      {rules.length === 0 ? (
        <>
          <p className="field__hint" style={{ marginBottom: 'var(--sp-3)' }}>
            Pertanyaan ini selalu tampak. Tambahkan aturan agar hanya muncul pada
            jawaban tertentu.
          </p>
          {!readOnly && (
            <Button variant="secondary" size="sm" onClick={addRule}>
              Tambah aturan
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="field">
            <label className="field__label" htmlFor={`cond-mode-${question.id}`}>
              Tampil bila
            </label>
            <select
              id={`cond-mode-${question.id}`}
              className="select"
              value={mode}
              onChange={(event) => write(rules, event.target.value)}
              disabled={readOnly}
            >
              <option value="all">semua aturan terpenuhi</option>
              <option value="any">salah satu aturan terpenuhi</option>
            </select>
          </div>

          {rules.map((rule, index) => (
            <ConditionRule
              key={index}
              rule={rule}
              triggers={triggers}
              readOnly={readOnly}
              onChange={(patch) =>
                write(rules.map((item, i) => (i === index ? { ...item, ...patch } : item)))
              }
              onRemove={() => write(rules.filter((_, i) => i !== index))}
            />
          ))}

          {!readOnly && (
            <Button variant="secondary" size="sm" onClick={addRule}>
              Tambah aturan
            </Button>
          )}

          <p className="field__hint" style={{ marginTop: 'var(--sp-3)' }}>
            Saat tersembunyi, pertanyaan ini tidak diwajibkan dan jawabannya tidak
            ikut dihitung.
          </p>
        </>
      )}
    </div>
  );
}

function ConditionRule({ rule, triggers, readOnly, onChange, onRemove }) {
  const trigger = triggers.find((item) => item.question.id === rule.questionId);
  const operator = OPERATORS.find((item) => item.id === rule.operator) ?? OPERATORS[0];
  const options = trigger?.question.options ?? [];
  const selected = Array.isArray(rule.value) ? rule.value : [rule.value];

  return (
    <div className="condrule">
      <select
        className="select"
        value={rule.questionId}
        onChange={(event) => {
          const next = triggers.find((item) => item.question.id === event.target.value);
          onChange({
            questionId: event.target.value,
            value: next?.question.options[0]?.value ?? '',
          });
        }}
        disabled={readOnly}
        aria-label="Pertanyaan pemicu"
      >
        {triggers.map(({ section, question }) => (
          <option key={question.id} value={question.id}>
            {question.code ? `${question.code} · ` : ''}
            {truncate(question.text || 'Pertanyaan tanpa teks')} — {section.name}
          </option>
        ))}
      </select>

      <div className="condrule__row">
        <select
          className="select"
          value={rule.operator}
          onChange={(event) => {
            const nextOp = OPERATORS.find((item) => item.id === event.target.value);
            onChange({
              operator: event.target.value,
              value: nextOp.multiple ? selected.filter(Boolean) : (selected[0] ?? ''),
            });
          }}
          disabled={readOnly}
          aria-label="Pembanding"
        >
          {OPERATORS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        {operator.needsValue && !operator.multiple && (
          <select
            className="select"
            value={selected[0] ?? ''}
            onChange={(event) => onChange({ value: event.target.value })}
            disabled={readOnly}
            aria-label="Nilai jawaban"
          >
            {options.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {!readOnly && (
          <IconButton label="Hapus aturan" onClick={onRemove} danger>
            <Icon name="trash" size={15} />
          </IconButton>
        )}
      </div>

      {operator.multiple && (
        <div className="condrule__multi">
          {options.map((option) => (
            <label key={option.id} className="checkbox">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onChange={(event) =>
                  onChange({
                    value: event.target.checked
                      ? [...selected.filter(Boolean), option.value]
                      : selected.filter((value) => value !== option.value),
                  })
                }
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const truncate = (text, max = 42) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;
