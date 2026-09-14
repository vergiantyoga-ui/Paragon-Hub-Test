import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { TextField, SelectField, TextAreaField, Checkbox } from '../../../components/ui/Field.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAppState } from '../../../store/AppStore.jsx';
import { useQuestionnaireActions } from '../../store/QuestionnaireStore.jsx';
import { MATERIAL_TYPES, QUESTIONNAIRE_TYPES } from '../../engine/index.js';
import { collectErrors, required } from '../../../lib/validation.js';

/**
 * Informasi dasar questionnaire. Menyimpan langsung membuat template beserta
 * versi draf pertamanya, lalu mengantar pengguna ke builder — supaya tidak ada
 * template kosong tanpa versi yang menggantung di daftar.
 */
export default function TemplateCreate() {
  const [values, setValues] = useState({
    name: '',
    code: '',
    type: '',
    description: '',
    targetSupplierType: '',
    materialType: '',
    estimatedMinutes: '',
    scoringEnabled: false,
  });
  const [errors, setErrors] = useState({});

  const actions = useQuestionnaireActions();
  const { session } = useAppState();
  const toast = useToast();
  const navigate = useNavigate();

  const set = (patch) => setValues((current) => ({ ...current, ...patch }));

  function handleSubmit(event) {
    event.preventDefault();

    const found = collectErrors({
      name: required(values.name, 'Nama questionnaire'),
      code: required(values.code, 'Kode'),
      type: required(values.type, 'Tipe'),
      materialType: required(values.materialType, 'Jenis material'),
    });
    setErrors(found);

    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const created = actions.createTemplate(values, session?.user);
    toast.success(`"${created.template.name}" dibuat sebagai draf.`);
    navigate(`/internal/questionnaire/${created.template.id}/v/${created.version.id}`);
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Questionnaire', to: '/internal/questionnaire' },
          { label: 'Buat baru' },
        ]}
        icon="consent"
        title="Buat questionnaire"
        description="Isi informasi dasar terlebih dahulu. Seksi dan pertanyaan disusun pada langkah berikutnya."
      />

      <div style={{ maxWidth: 720 }}>
        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field-grid">
              <TextField
                label="Nama questionnaire"
                className="span-full"
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                error={errors.name}
                placeholder="Misalnya Supplier Audit"
                required
              />
              <TextField
                label="Kode"
                value={values.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                error={errors.code}
                placeholder="QST-AUD"
                hint="Dipakai pada laporan dan penomoran."
                required
              />
              <SelectField
                label="Tipe"
                options={QUESTIONNAIRE_TYPES}
                value={values.type}
                onChange={(e) => set({ type: e.target.value })}
                error={errors.type}
                required
              />
              <TextAreaField
                label="Deskripsi"
                className="span-full"
                rows={3}
                value={values.description}
                onChange={(e) => set({ description: e.target.value })}
                hint="Jelaskan singkat tujuan kuesioner ini bagi pemasok."
              />
              <TextField
                label="Sasaran pemasok"
                value={values.targetSupplierType}
                onChange={(e) => set({ targetSupplierType: e.target.value })}
                placeholder="Misalnya pemasok bahan baku"
              />
              <SelectField
                label="Jenis material"
                options={MATERIAL_TYPES}
                value={values.materialType}
                onChange={(e) => set({ materialType: e.target.value })}
                error={errors.materialType}
                required
              />
              <TextField
                label="Perkiraan waktu pengisian"
                type="number"
                inputMode="numeric"
                value={values.estimatedMinutes}
                onChange={(e) => set({ estimatedMinutes: e.target.value })}
                hint="Dalam menit. Ditampilkan kepada pemasok."
              />
            </div>

            <div style={{ marginTop: 'var(--sp-2)' }}>
              <Checkbox
                checked={values.scoringEnabled}
                onChange={(checked) => set({ scoringEnabled: checked })}
              >
                Aktifkan skoring dan klasifikasi risiko
              </Checkbox>
              <p className="field__hint" style={{ marginLeft: 29 }}>
                Biarkan mati untuk kuesioner yang hanya berupa deklarasi dan dokumen, misalnya
                Animal Free Statement. Pengaturan ini masih dapat diubah selama versi berstatus draf.
              </p>
            </div>

            <div className="form-actions">
              <Button variant="secondary" to="/internal/questionnaire">
                Batal
              </Button>
              <Button type="submit">Simpan dan susun pertanyaan</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
