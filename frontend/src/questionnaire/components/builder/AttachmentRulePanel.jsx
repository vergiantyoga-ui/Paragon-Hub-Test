import { TextField, Checkbox } from '../../../components/ui/Field.jsx';
import { getType } from '../../engine/index.js';
import { makeAttachmentRule } from '../../engine/schema.js';

/**
 * Aturan lampiran per pertanyaan.
 *
 * Dipisah dari properti umum karena konfigurasinya cukup panjang dan hanya
 * relevan bagi sebagian tipe soal. Nilai bawaan sengaja sama dengan aturan
 * unggahan yang sudah berlaku di portal pemasok — PDF, JPG, PNG, maksimal 2 MB.
 */

const FILE_TYPES = [
  { id: 'application/pdf', label: 'PDF' },
  { id: 'image/jpeg', label: 'JPG' },
  { id: 'image/png', label: 'PNG' },
];

export default function AttachmentRulePanel({ question, readOnly, onUpdate }) {
  const type = getType(question.type);
  if (!type.allowsAttachment) return null;

  const rule = question.attachmentRule;
  const enabled = Boolean(rule);

  const set = (patch) => onUpdate({ attachmentRule: { ...rule, ...patch } });

  return (
    <div className="props__block">
      <h3 className="props__subtitle">Dokumen pendukung</h3>

      <Checkbox
        checked={enabled}
        disabled={readOnly}
        onChange={(checked) =>
          onUpdate({ attachmentRule: checked ? makeAttachmentRule() : null })
        }
      >
        Pertanyaan ini meminta lampiran
      </Checkbox>

      {enabled && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Checkbox
            checked={rule.required}
            disabled={readOnly}
            onChange={(checked) => set({ required: checked })}
          >
            Lampiran wajib diunggah
          </Checkbox>

          <div className="field-grid" style={{ marginTop: 'var(--sp-4)' }}>
            <TextField
              label="Jumlah berkas maksimum"
              type="number"
              min="1"
              max="20"
              value={rule.maxFiles}
              onChange={(e) => set({ maxFiles: Math.max(1, Number(e.target.value)) })}
              disabled={readOnly}
            />
            <TextField
              label="Ukuran maksimum (MB)"
              type="number"
              min="1"
              max="50"
              value={rule.maxFileSizeMb}
              onChange={(e) => set({ maxFileSizeMb: Math.max(1, Number(e.target.value)) })}
              disabled={readOnly}
            />
          </div>

          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="field__label">Format yang diterima</legend>
            <div className="stack-sm">
              {FILE_TYPES.map((fileType) => {
                const checked = rule.allowedTypes.includes(fileType.id);
                const isLast = checked && rule.allowedTypes.length === 1;

                return (
                  <Checkbox
                    key={fileType.id}
                    checked={checked}
                    disabled={readOnly || isLast}
                    onChange={(next) =>
                      set({
                        allowedTypes: next
                          ? [...rule.allowedTypes, fileType.id]
                          : rule.allowedTypes.filter((id) => id !== fileType.id),
                      })
                    }
                  >
                    <span className="text-sm">{fileType.label}</span>
                  </Checkbox>
                );
              })}
            </div>
            <p className="field__hint">
              Minimal satu format harus tetap dipilih.
            </p>
          </fieldset>

          <Checkbox
            checked={rule.expiryDateRequired}
            disabled={readOnly}
            onChange={(checked) =>
              set({ expiryDateRequired: checked, expiryMinDays: checked ? rule.expiryMinDays : null })
            }
          >
            Minta tanggal berlaku dokumen
          </Checkbox>

          {rule.expiryDateRequired && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <TextField
                label="Sisa masa berlaku minimum (hari)"
                type="number"
                min="0"
                value={rule.expiryMinDays ?? ''}
                onChange={(e) =>
                  set({ expiryMinDays: e.target.value === '' ? null : Number(e.target.value) })
                }
                disabled={readOnly}
                hint="Kosongkan bila cukup asal belum kedaluwarsa. Diisi 90 berarti dokumen yang berlaku kurang dari tiga bulan lagi akan ditolak."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
