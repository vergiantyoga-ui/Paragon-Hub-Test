import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import DataList from '../../../components/ui/DataList.jsx';
import QuestionnaireStatusBadge from '../../components/shared/QuestionnaireStatusBadge.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAppState } from '../../../store/AppStore.jsx';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
  versionsOf,
} from '../../store/QuestionnaireStore.jsx';
import {
  TEMPLATE_STATUS,
  countQuestions,
  countSections,
  publishBlockers,
} from '../../engine/index.js';
import { formatDate, formatDateTime } from '../../../lib/format.js';
import './template-list.css';

/**
 * Detail satu template: informasi dasar, seluruh versinya, dan tindakan
 * siklus hidup. Versi yang sudah terbit tidak menawarkan tombol sunting —
 * satu-satunya jalan mengubahnya adalah membuat versi baru.
 */
export default function TemplateDetail() {
  const { templateId } = useParams();
  const { templates, versions, auditLog } = useQuestionnaireState();
  const actions = useQuestionnaireActions();
  const { session } = useAppState();
  const toast = useToast();

  const [blockers, setBlockers] = useState(null);
  const [confirmingArchive, setConfirmingArchive] = useState(null);

  const template = templates.find((item) => item.id === templateId);
  if (!template) return <Navigate to="/internal/questionnaire" replace />;

  const list = versionsOf(versions, template.id);
  const actor = session?.user;
  const logEntries = auditLog.filter((entry) => entry.objectId === template.id).slice(0, 8);

  function handlePublish(version) {
    const problems = publishBlockers(version);
    if (problems.length > 0) {
      setBlockers({ version, problems });
      return;
    }
    const result = actions.publishVersion(version.id, actor);
    if (result.ok) toast.success(`${version.versionLabel} diterbitkan.`);
    else toast.error(result.message);
  }

  function handleNewVersion(version) {
    const next = actions.createNewVersion(version.id, actor);
    if (next) toast.success(`${next.versionLabel} dibuat sebagai draf.`);
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Questionnaire', to: '/internal/questionnaire' },
          { label: template.name },
        ]}
        icon="consent"
        title={template.name}
        description={template.description}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              const copy = actions.duplicateTemplate(template.id, actor);
              if (copy) toast.success(`Disalin menjadi "${copy.template.name}".`);
            }}
          >
            Duplikat
          </Button>
        }
      />

      <div className="qdetail__grid">
        <div className="stack-lg">
          <Card title="Versi" subtitle="Versi terbit tidak dapat disunting langsung">
            {list.map((version) => {
              const isDraft = version.status === TEMPLATE_STATUS.DRAFT;
              const isPublished = version.status === TEMPLATE_STATUS.PUBLISHED;

              return (
                <div className="version-row" key={version.id}>
                  <div>
                    <span className="version-row__label">{version.versionLabel}</span>
                    <span className="version-row__meta">
                      {countSections(version)} seksi · {countQuestions(version)} soal
                      {version.scoringEnabled ? ' · skoring aktif' : ' · tanpa skoring'}
                      {version.publishedAt && ` · terbit ${formatDate(version.publishedAt)}`}
                    </span>
                  </div>

                  <div className="row">
                    <QuestionnaireStatusBadge status={version.status} />

                    {isDraft && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          to={`/internal/questionnaire/${template.id}/v/${version.id}`}
                        >
                          Sunting
                        </Button>
                        <Button size="sm" onClick={() => handlePublish(version)}>
                          Terbitkan
                        </Button>
                      </>
                    )}

                    {isPublished && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          to={`/internal/questionnaire/${template.id}/v/${version.id}`}
                        >
                          Lihat
                        </Button>
                        <Button size="sm" onClick={() => handleNewVersion(version)}>
                          Buat versi baru
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() => {
                            actions.unpublishVersion(version.id, actor);
                            toast.notify(`${version.versionLabel} ditarik dari peredaran.`);
                          }}
                        >
                          Tarik
                        </Button>
                      </>
                    )}

                    {!isDraft && !isPublished && version.status !== TEMPLATE_STATUS.ARCHIVED && (
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() => setConfirmingArchive(version)}
                      >
                        Arsipkan
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>

          {logEntries.length > 0 && (
            <Card title="Riwayat perubahan" subtitle="Delapan tindakan terakhir">
              <ul className="timeline">
                {logEntries.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.action}</span>
                    <time dateTime={entry.at}>
                      {formatDateTime(entry.at)} · {entry.actorName}
                    </time>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card title="Informasi dasar">
          <DataList
            items={[
              { label: 'Kode', value: template.code },
              { label: 'Tipe', value: template.type },
              { label: 'Sasaran pemasok', value: template.targetSupplierType, full: true },
              { label: 'Jenis material', value: template.materialType },
              { label: 'Pemilik', value: template.ownerName },
              { label: 'Dibuat', value: formatDate(template.createdAt) },
              { label: 'Diperbarui', value: formatDate(template.updatedAt) },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={Boolean(blockers)}
        onClose={() => setBlockers(null)}
        title="Versi belum layak terbit"
        description={`${blockers?.version.versionLabel ?? ''} masih memiliki hal yang perlu dibereskan.`}
        footer={<Button onClick={() => setBlockers(null)}>Mengerti</Button>}
      >
        <ul className="stack-sm" style={{ margin: 0, paddingLeft: '1.1em' }}>
          {blockers?.problems.map((problem) => (
            <li key={problem} className="text-sm">
              {problem}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={Boolean(confirmingArchive)}
        onClose={() => setConfirmingArchive(null)}
        title="Arsipkan versi ini?"
        description="Versi yang diarsipkan tidak lagi dapat ditugaskan, tetapi respons lama tetap tersimpan utuh."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingArchive(null)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                actions.archiveVersion(confirmingArchive.id, actor);
                toast.notify(`${confirmingArchive.versionLabel} diarsipkan.`);
                setConfirmingArchive(null);
              }}
            >
              Arsipkan
            </Button>
          </>
        }
      />
    </>
  );
}
