import { useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import SubmissionReview from './SubmissionReview.jsx';
import { useAppState } from '../../store/AppStore.jsx';
import { STATUS } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/** Saringan status; label diambil dari kamus saat dirender. */
const FILTERS = [
  { id: 'all', key: 'common.all' },
  { id: STATUS.SUPPLIER_REQUEST, key: `status.${STATUS.SUPPLIER_REQUEST}` },
  { id: STATUS.APPROVED, key: `status.${STATUS.APPROVED}` },
  { id: 'onboarding', key: `status.${STATUS.ONBOARDING}` },
  { id: STATUS.QUALIFICATION, key: `status.${STATUS.QUALIFICATION}` },
  { id: STATUS.PREFERRED, key: `status.${STATUS.PREFERRED}` },
  { id: STATUS.REJECTED, key: `status.${STATUS.REJECTED}` },
];

const ONBOARDING_STATUSES = [
  STATUS.INVITED,
  STATUS.INTERNAL_DRAFT,
  STATUS.CONNECTED,
  STATUS.ONBOARDING,
  STATUS.REGISTRATION,
  STATUS.NEEDS_DOCUMENT_FIX,
];

/**
 * Layar kerja utama staf procurement: daftar pengajuan di kiri,
 * detail pengajuan terpilih di kanan.
 */
export default function QueueDashboard() {
  const t = useT();
  const { submissions } = useAppState();
  const [filter, setFilter] = useState(STATUS.SUPPLIER_REQUEST);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const byFilter = submissions.filter((s) => {
      if (filter === 'all') return true;
      if (filter === 'onboarding') return ONBOARDING_STATUSES.includes(s.status);
      return s.status === filter;
    });

    const term = query.trim().toLowerCase();
    if (!term) return byFilter;
    return byFilter.filter(
      (s) =>
        s.general.vendorName.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term),
    );
  }, [submissions, filter, query]);

  const selected =
    submissions.find((s) => s.id === selectedId) ??
    (visible.length ? visible[0] : null);

  return (
    <>
      <PageHeader
        trail={[{ label: t('common.home'), to: '/internal/beranda' }, { label: 'Supplier request' }]}
        icon="queue"
        title="Supplier request"
        description="Tinjau data yang dikirim pemasok, lalu setujui atau tolak. Setelah disetujui, pilih cara melanjutkan onboarding."
      />

      <div className="queue-layout">
        <aside className="queue-panel" aria-label="Daftar pengajuan">
          <label className="visually-hidden" htmlFor="queue-search">
            {t('common.search')}
          </label>
          <input
            id="queue-search"
            type="search"
            className="input"
            placeholder={t('queue.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 'var(--sp-4)' }}
          />

          <div className="queue-filters" role="group" aria-label={t('queue.filterByStatus')}>
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="queue-filter"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {t(item.key)}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="text-sm muted" style={{ padding: 'var(--sp-3) 0' }}>
              {t('queue.empty')}
            </p>
          ) : (
            <ul className="queue-list">
              {visible.map((submission) => (
                <li key={submission.id}>
                  <button
                    type="button"
                    className="queue-item"
                    aria-current={selected?.id === submission.id}
                    onClick={() => setSelectedId(submission.id)}
                  >
                    <span className="queue-item__name">{submission.general.vendorName}</span>
                    <span className="queue-item__meta">
                      {submission.id} · {formatDate(submission.submittedAt)}
                    </span>
                    <StatusBadge status={submission.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div>
          {selected ? (
            <SubmissionReview key={selected.id} submission={selected} />
          ) : (
            <div className="card">
              <EmptyState
                title="Belum ada pengajuan yang cocok"
                description="Ubah saringan atau kata kunci pencarian untuk melihat pengajuan lain."
                action={
                  <Button variant="secondary" onClick={() => { setFilter('all'); setQuery(''); }}>
                    {t('common.showAll')}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
