import Button from '../../../components/ui/Button.jsx';
import { TextField, TextAreaField, Checkbox } from '../../../components/ui/Field.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { IconButton } from './QuestionCard.jsx';
import ConditionEditor from './ConditionEditor.jsx';
import AttachmentRulePanel from './AttachmentRulePanel.jsx';
import {
  QUESTION_TYPES,
  getType,
  listTypesByGroup,
  makeOption,
} from '../../engine/index.js';

/**
 * Panel properti di sisi kanan builder.
 *
 * Menampilkan pengaturan seksi atau pertanyaan sesuai yang sedang dipilih.
 * Pengaturan yang tidak berlaku bagi sebuah tipe soal — misalnya daftar
 * pilihan pada isian teks — disembunyikan, bukan dinonaktifkan, supaya panel
 * tidak dipenuhi kolom yang tak pernah terpakai.
 */
export default function PropertiesPanel({
  version,
  selection,
  readOnly,
  onUpdateSection,
  onUpdateQuestion,
  onChangeType,
}) {
  if (!selection) {
    return (
      <aside className="props" aria-label="Properti">
        <p className="props__empty">
          Pilih sebuah seksi atau pertanyaan pada kanvas untuk mengatur propertinya.
        </p>
      </aside>
    );
  }

  return (
    <aside className="props" aria-label="Properti">
      {selection.kind === 'section' ? (
        <SectionProps
          section={selection.section}
          readOnly={readOnly}
          scoringEnabled={version.scoringEnabled}
          onUpdate={onUpdateSection}
        />
      ) : (
        <QuestionProps
          version={version}
          question={selection.question}
          readOnly={readOnly}
          scoringEnabled={version.scoringEnabled}
          onUpdate={onUpdateQuestion}
          onChangeType={onChangeType}
        />
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function SectionProps({ section, readOnly, scoringEnabled, onUpdate }) {
  return (
    <>
      <h2 className="props__title">Properti seksi</h2>

      <TextField
        label="Nama seksi"
        value={section.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        disabled={readOnly}
      />

      <TextAreaField
        label="Deskripsi"
        rows={3}
        value={section.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        disabled={readOnly}
        hint="Ditampilkan di atas pertanyaan saat pemasok mengisi."
      />

      <Checkbox
        checked={section.mandatory}
        onChange={(checked) => onUpdate({ mandatory: checked })}
        disabled={readOnly}
      >
        Seksi wajib diisi
      </Checkbox>

      {scoringEnabled && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <TextField
            label="Bobot seksi"
            type="number"
            min="0"
            step="0.5"
            value={section.weight}
            onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
            disabled={readOnly}
            hint="Bobot diterapkan pada persentase seksi, bukan pada skor mentah."
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function QuestionProps({ version, question, readOnly, scoringEnabled, onUpdate, onChangeType }) {
  const type = getType(question.type);
  const groups = listTypesByGroup();

  return (
    <>
      <h2 className="props__title">Properti pertanyaan</h2>

      <TextAreaField
        label="Teks pertanyaan"
        rows={3}
        value={question.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        disabled={readOnly}
      />

      <TextField
        label="Kode"
        value={question.code}
        onChange={(e) => onUpdate({ code: e.target.value.toUpperCase() })}
        disabled={readOnly}
        placeholder="QMS-01"
        hint="Memudahkan penelusuran pada laporan."
      />

      <div className="field">
        <label className="field__label" htmlFor="prop-type">
          Tipe soal
        </label>
        <select
          id="prop-type"
          className="select"
          value={question.type}
          onChange={(e) => onChangeType(e.target.value)}
          disabled={readOnly}
        >
          {groups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.types.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="field__hint">
          Mengganti tipe akan mengatur ulang daftar pilihan dan aturan lampiran.
        </p>
      </div>

      <TextAreaField
        label="Panduan pengisian"
        rows={2}
        value={question.guidance}
        onChange={(e) => onUpdate({ guidance: e.target.value })}
        disabled={readOnly}
        hint="Penjelasan singkat yang membantu pemasok menjawab dengan benar."
      />

      <Checkbox
        checked={question.required}
        onChange={(checked) => onUpdate({ required: checked })}
        disabled={readOnly}
      >
        Wajib dijawab
      </Checkbox>

      {type.hasOptions && (
        <OptionEditor
          question={question}
          readOnly={readOnly}
          scoringEnabled={scoringEnabled}
          onUpdate={onUpdate}
        />
      )}

      {scoringEnabled && type.supportsScoring && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <TextField
            label="Bobot pertanyaan"
            type="number"
            min="0"
            step="0.5"
            value={question.weight}
            onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      )}

      <ValidationFields question={question} readOnly={readOnly} onUpdate={onUpdate} />

      <ConditionEditor
        version={version}
        question={question}
        readOnly={readOnly}
        onUpdate={onUpdate}
      />

      <AttachmentRulePanel question={question} readOnly={readOnly} onUpdate={onUpdate} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function OptionEditor({ question, readOnly, scoringEnabled, onUpdate }) {
  const options = question.options ?? [];

  const update = (id, patch) =>
    onUpdate({
      options: options.map((option) => (option.id === id ? { ...option, ...patch } : option)),
    });

  const remove = (id) => onUpdate({ options: options.filter((option) => option.id !== id) });

  const add = () =>
    onUpdate({
      options: [...options, makeOption({ label: '', value: `opt${options.length + 1}` })],
    });

  return (
    <div className="props__block">
      <h3 className="props__subtitle">Pilihan jawaban</h3>

      {options.length < 2 && (
        <p className="field__error" role="alert">
          Diperlukan minimal dua pilihan sebelum versi dapat diterbitkan.
        </p>
      )}

      {options.map((option) => (
        <div className="optrow" key={option.id}>
          <input
            className="input optrow__label"
            value={option.label}
            onChange={(e) => update(option.id, { label: e.target.value })}
            disabled={readOnly}
            aria-label="Label pilihan"
            placeholder="Label"
          />

          {scoringEnabled && (
            <input
              className="input optrow__score"
              type="number"
              value={option.score}
              onChange={(e) => update(option.id, { score: Number(e.target.value) })}
              disabled={readOnly || option.excludeFromScoring}
              aria-label={`Skor untuk ${option.label || 'pilihan'}`}
              title="Skor"
            />
          )}

          {!readOnly && (
            <IconButton label={`Hapus pilihan ${option.label}`} onClick={() => remove(option.id)} danger>
              <Icon name="trash" size={15} />
            </IconButton>
          )}
        </div>
      ))}

      {scoringEnabled && (
        <div className="props__nascan">
          {options.map((option) => (
            <Checkbox
              key={option.id}
              checked={option.excludeFromScoring}
              onChange={(checked) => update(option.id, { excludeFromScoring: checked })}
              disabled={readOnly}
            >
              <span className="text-xs">
                &ldquo;{option.label || 'pilihan'}&rdquo; dikecualikan dari skor
              </span>
            </Checkbox>
          ))}
          <p className="field__hint">
            Jawaban yang dikecualikan tidak dihitung sebagai nol, melainkan dikeluarkan
            dari pembagi.
          </p>
        </div>
      )}

      {!readOnly && (
        <Button variant="secondary" size="sm" onClick={add}>
          Tambah pilihan
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ValidationFields({ question, readOnly, onUpdate }) {
  const type = question.type;
  const validation = question.validation ?? {};

  const set = (patch) => onUpdate({ validation: { ...validation, ...patch } });
  const num = (value) => (value === '' ? undefined : Number(value));

  if (type === 'short_text' || type === 'long_text') {
    return (
      <div className="props__block">
        <h3 className="props__subtitle">Batas isian</h3>
        <div className="field-grid">
          <TextField
            label="Minimal karakter"
            type="number"
            min="0"
            value={validation.minLength ?? ''}
            onChange={(e) => set({ minLength: num(e.target.value) })}
            disabled={readOnly}
          />
          <TextField
            label="Maksimal karakter"
            type="number"
            min="0"
            value={validation.maxLength ?? ''}
            onChange={(e) => set({ maxLength: num(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  if (['number', 'percentage', 'currency', 'rating', 'score'].includes(type)) {
    return (
      <div className="props__block">
        <h3 className="props__subtitle">Batas nilai</h3>
        <div className="field-grid">
          <TextField
            label="Nilai minimum"
            type="number"
            value={validation.min ?? ''}
            onChange={(e) => set({ min: num(e.target.value) })}
            disabled={readOnly}
          />
          <TextField
            label="Nilai maksimum"
            type="number"
            value={validation.max ?? ''}
            onChange={(e) => set({ max: num(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  if (type === 'multiple_choice') {
    return (
      <div className="props__block">
        <h3 className="props__subtitle">Batas pilihan</h3>
        <div className="field-grid">
          <TextField
            label="Minimal dipilih"
            type="number"
            min="0"
            value={validation.minSelected ?? ''}
            onChange={(e) => set({ minSelected: num(e.target.value) })}
            disabled={readOnly}
          />
          <TextField
            label="Maksimal dipilih"
            type="number"
            min="0"
            value={validation.maxSelected ?? ''}
            onChange={(e) => set({ maxSelected: num(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  return null;
}
