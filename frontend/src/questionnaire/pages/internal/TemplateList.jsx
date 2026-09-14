import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import QuestionnaireStatusBadge from '../../components/shared/QuestionnaireStatusBadge.jsx';
import {
  representativeVersion,
  useQuestionnaireState,
  versionsOf,
} from '../../store/QuestionnaireStore.jsx';
import { TEMPLATE_STATUS, countQuestions, countSections } from '../../engine/index.js';
import { formatDate } from '../../../lib/format.js';
import './template-list.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: TEMPLATE_STATUS.DRAFT, label: 'Draf' },
  { id: TEMPLATE_STATUS.PUBLISHED, label: 'Terbit' },
  { id: TEMPLATE_STATUS.UNPUBLISHED, label: 'Ditarik' },
  { id: TEMPLATE_STATUS.ARCHIVED, label: 'Diarsipkan' },
];

/**
 * Daftar template questionnaire.
 *
 * Satu baris mewakili satu template, menampilkan versi yang terbit bila ada.
 * Jumlah versi ditampilkan agar admin tahu ada riwayat di baliknya tanpa
 * harus membuka detailnya.
 */
export default function TemplateList() {
  const { templates, versions } = useQuestionnaireState();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

  const types = useMemo(
    () => ['all', ...new Set(templates.map((template) => template.type))],
    [templates],
  );

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();

    return templates
      .map((template) => {
        const version = representativeVersion(versions, template.id);
        return {
          template,
          version,
          versionCount: versionsOf(versions, template.id).length,
        };
      })
      .filter(({ template, version }) => {
        if (status !== 'all' && version?.status !== status) return false;
        if (type !== 'all' && template.type !== type) return false;
        if (!term) return true;
        return (
          template.name.toLowerCase().includes(term) ||
          template.code.toLowerCase().includes(term) ||
          template.type.toLowerCase().includes(term)
        );
      });
  }, [templates, versions, query, status, type]);

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Questionnaire' }]}
        icon="consent"
        title="Questionnaire"
        description="Kelola template kuesioner yang dapat ditugaskan berulang kali kepada pemasok."
        actions={<Button to="/internal/questionnaire/baru">Buat questionnaire</Button>}
      />

      <div className="qlist__toolbar">
        <div className="qlist__search">
          <label className="visually-hidden" htmlFor="q-search">
            Cari questionnaire
          </label>
          <input
            id="q-search"
            type="search"
            className="input"
            placeholder="Cari nama, kode, atau tipe"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="queue-filters" role="group" aria-label="Saring menurut status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="queue-filter"
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div>
          <label className="visually-hidden" htmlFor="q-type">
            Saring menurut tipe
          </label>
          <select
            id="q-type"
            className="select"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {types.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'Semua tipe' : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Tidak ada questionnaire yang cocok"
            description="Ubah kata kunci atau saringan, atau buat template baru untuk mulai menyusun pertanyaan."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setType('all');
                }}
              >
                Tampilkan semua
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card qlist__tablewrap">
          <table className="qtable">
            <caption className="visually-hidden">
              Daftar template questionnaire beserta versi dan statusnya
            </caption>
            <thead>
              <tr>
                <th scope="col">Questionnaire</th>
                <th scope="col">Tipe</th>
                <th scope="col">Versi</th>
                <th scope="col">Status</th>
                <th scope="col" className="qtable__num">
                  Seksi
                </th>
                <th scope="col" className="qtable__num">
                  Soal
                </th>
                <th scope="col">Pemilik</th>
                <th scope="col">Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ template, version, versionCount }) => (
                <tr key={template.id}>
                  <th scope="row">
                    <Link to={`/internal/questionnaire/${template.id}`} className="qtable__link">
                      {template.name}
                    </Link>
                    <span className="qtable__sub">{template.code}</span>
                  </th>
                  <td>{template.type}</td>
                  <td>
                    {version?.versionLabel ?? '—'}
                    {versionCount > 1 && (
                      <span className="qtable__sub">{versionCount} versi</span>
                    )}
                  </td>
                  <td>{version ? <QuestionnaireStatusBadge status={version.status} /> : '—'}</td>
                  <td className="qtable__num">{version ? countSections(version) : 0}</td>
                  <td className="qtable__num">{version ? countQuestions(version) : 0}</td>
                  <td>{template.ownerName}</td>
                  <td>{formatDate(template.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
