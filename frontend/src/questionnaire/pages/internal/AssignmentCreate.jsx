import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { TextField, SelectField, TextAreaField } from '../../../components/ui/Field.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAppState } from '../../../store/AppStore.jsx';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
  versionsOf,
} from '../../store/QuestionnaireStore.jsx';
import { TEMPLATE_STATUS, MATERIAL_TYPES } from '../../engine/index.js';
import { PRIORITIES } from '../../store/assignmentMockData.js';
import { INTERNAL_USERS } from '../../../lib/mockData.js';
import { hasFinishedRegistration } from '../../../lib/constants.js';
import { VENDOR_TYPES, labelOf } from '../../../lib/masterData.js';
import { collectErrors, required } from '../../../lib/validation.js';

/**
 * Menugaskan kuesioner kepada pemasok.
 *
 * Hanya versi terbit yang dapat ditugaskan, dan hanya pemasok berstatus aktif
 * yang muncul pada daftar — menugaskan kuesioner kepada pemasok yang
 * pendaftarannya belum tuntas hanya akan menghasilkan tugas yang tak bisa dibuka.
 */
export default function AssignmentCreate() {
  const { templates, versions } = useQuestionnaireState();
  const actions = useQuestionnaireActions();
  const { submissions, session } = useAppState();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    templateId: '',
    versionId: '',
    supplierId: '',
    materialCategory: '',
    materialName: '',
    dueDate: '',
    reviewerId: '',
    priority: 'normal',
    instructions: '',
  });
  const [errors, setErrors] = useState({});

  const set = (patch) => setValues((current) => ({ ...current, ...patch }));

  /** Template yang punya minimal satu versi terbit. */
  const publishable = useMemo(
    () =>
      templates.filter((template) =>
        versionsOf(versions, template.id).some((v) => v.status === TEMPLATE_STATUS.PUBLISHED),
      ),
    [templates, versions],
  );

  const availableVersions = values.templateId
    ? versionsOf(versions, values.templateId).filter(
        (v) => v.status === TEMPLATE_STATUS.PUBLISHED,
      )
    : [];

  // Kuesioner ditugaskan sejak tahap qualification; menunggu status preferred
  // justru membalik urutannya, sebab hasil kuesioner ikut dinilai manager.
  const activeSuppliers = submissions.filter((item) => hasFinishedRegistration(item.status));

  function handleSubmit(event) {
    event.preventDefault();

    const found = collectErrors({
      templateId: required(values.templateId, 'Kuesioner'),
      versionId: required(values.versionId, 'Versi'),
      supplierId: required(values.supplierId, 'Pemasok'),
      dueDate: required(values.dueDate, 'Tenggat'),
      reviewerId: required(values.reviewerId, 'Peninjau'),
    });
    setErrors(found);

    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const supplier = submissions.find((item) => item.id === values.supplierId);
    const reviewer = INTERNAL_USERS.find((user) => user.id === values.reviewerId);

    actions.createAssignment(
      {
        templateId: values.templateId,
        versionId: values.versionId,
        supplierId: supplier.id,
        supplierName: supplier.general.vendorName,
        supplierSite: `${supplier.address.city}, ${supplier.address.province}`,
        materialCategory: values.materialCategory || labelOf(VENDOR_TYPES, supplier.general.vendorType),
        materialName: values.materialName,
        dueDate: new Date(values.dueDate).toISOString(),
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        priority: values.priority,
        instructions: values.instructions,
      },
      session?.user,
    );

    toast.success(`Kuesioner ditugaskan kepada ${supplier.general.vendorName}.`);
    navigate('/internal/penugasan');
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Penugasan', to: '/internal/penugasan' },
          { label: 'Tugaskan kuesioner' },
        ]}
        icon="queue"
        title="Tugaskan kuesioner"
        description="Pilih kuesioner yang sudah terbit, tentukan pemasok, tenggat, dan peninjaunya."
      />

      <div style={{ maxWidth: 720 }}>
        <Card>
          {publishable.length === 0 ? (
            <p className="text-sm muted">
              Belum ada kuesioner yang terbit. Terbitkan sebuah versi terlebih dahulu sebelum
              menugaskannya.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="field-grid">
                <SelectField
                  label="Kuesioner"
                  options={publishable.map((t) => ({ value: t.id, label: t.name }))}
                  value={values.templateId}
                  onChange={(e) => set({ templateId: e.target.value, versionId: '' })}
                  error={errors.templateId}
                  required
                />
                <SelectField
                  label="Versi"
                  options={availableVersions.map((v) => ({ value: v.id, label: v.versionLabel }))}
                  value={values.versionId}
                  onChange={(e) => set({ versionId: e.target.value })}
                  error={errors.versionId}
                  disabled={!values.templateId}
                  hint="Hanya versi terbit yang dapat ditugaskan."
                  required
                />

                <SelectField
                  label="Pemasok"
                  className="span-full"
                  options={activeSuppliers.map((s) => ({
                    value: s.id,
                    label: `${s.general.vendorName} — ${s.id}`,
                  }))}
                  value={values.supplierId}
                  onChange={(e) => set({ supplierId: e.target.value })}
                  error={errors.supplierId}
                  hint="Hanya pemasok berstatus aktif yang dapat menerima penugasan."
                  required
                />

                <SelectField
                  label="Kategori material"
                  options={MATERIAL_TYPES}
                  value={values.materialCategory}
                  onChange={(e) => set({ materialCategory: e.target.value })}
                />
                <TextField
                  label="Material atau produk"
                  value={values.materialName}
                  onChange={(e) => set({ materialName: e.target.value })}
                  placeholder="Opsional"
                />

                <TextField
                  label="Tenggat pengisian"
                  type="date"
                  value={values.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                  error={errors.dueDate}
                  required
                />
                <SelectField
                  label="Prioritas"
                  options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))}
                  value={values.priority}
                  onChange={(e) => set({ priority: e.target.value })}
                />

                <SelectField
                  label="Peninjau"
                  className="span-full"
                  options={INTERNAL_USERS.map((u) => ({ value: u.id, label: u.name }))}
                  value={values.reviewerId}
                  onChange={(e) => set({ reviewerId: e.target.value })}
                  error={errors.reviewerId}
                  required
                />

                <TextAreaField
                  label="Instruksi tambahan"
                  className="span-full"
                  rows={3}
                  value={values.instructions}
                  onChange={(e) => set({ instructions: e.target.value })}
                  hint="Ditampilkan kepada pemasok di atas kuesioner."
                />
              </div>

              <div className="form-actions">
                <Button variant="secondary" to="/internal/penugasan">
                  Batal
                </Button>
                <Button type="submit">Tugaskan</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
