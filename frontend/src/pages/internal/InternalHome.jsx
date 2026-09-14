import PageHeader from '../../components/ui/PageHeader.jsx';
import TileGrid from '../../components/ui/TileGrid.jsx';
import Card from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAppState } from '../../store/AppStore.jsx';
import { STATUS, STATUS_LABEL, STATUS_PIPELINE } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Ringkasan pembuka konsol. Kartu menu menjadi jalan pintas ke tugas
 * yang menunggu, ditambah daftar aktivitas terakhir agar staf tahu
 * apa yang berubah sejak terakhir membuka.
 */
export default function InternalHome() {
  const t = useT();
  const { submissions, session } = useAppState();
  const user = session.user;
  const count = (status) => submissions.filter((s) => s.status === status).length;

  const tiles = [
    { to: '/internal/antrian', label: 'Supplier request', icon: 'queue', count: count(STATUS.SUPPLIER_REQUEST) },
    { to: '/internal/verifikasi', label: 'Registrasi', icon: 'verify', count: count(STATUS.REGISTRATION) },
    { to: '/internal/kualifikasi', label: 'Qualification', icon: 'approval', count: count(STATUS.QUALIFICATION) },
    { to: '/internal/preferred', label: 'Preferred', icon: 'profile', count: count(STATUS.AWAITING_PREFERRED) },
  ];

  /**
   * Tahapan pemasok berurutan. Menampilkan seluruh langkah sekaligus, termasuk
   * yang sedang kosong, supaya staf melihat bentuk keseluruhan alurnya dan tahu
   * di mana pemasok menumpuk.
   */
  const pipeline = STATUS_PIPELINE.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    value: count(status),
  }));

  const disqualified = count(STATUS.DISQUALIFIED);

  const recent = [...submissions]
    .filter((s) => s.timeline.length > 0)
    .sort(
      (a, b) =>
        new Date(b.timeline[b.timeline.length - 1].at) -
        new Date(a.timeline[a.timeline.length - 1].at),
    )
    .slice(0, 5);

  return (
    <>
      <PageHeader
        trail={[{ label: t('common.home') }]}
        icon="home"
        title={`Selamat datang, ${user.name.split(' ')[0]}`}
        description="Ringkasan pekerjaan yang menunggu tindakan Anda hari ini."
      />

      <TileGrid tiles={tiles} />

      <Card
        title="Tahapan pemasok"
        subtitle="Jumlah pemasok pada setiap langkah"
        style={{ marginTop: 'var(--sp-5)' }}
      >
        <ol className="pipeline">
          {pipeline.map((step, index) => (
            <li className="pipeline__step" key={step.status}>
              <span className="pipeline__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="pipeline__label">{step.label}</span>
              <span className="pipeline__count">{step.value}</span>
            </li>
          ))}
        </ol>

        {disqualified > 0 && (
          <p className="pipeline__aside">
            {disqualified} pemasok didiskualifikasi dan berada di luar alur ini.
          </p>
        )}
      </Card>

      <Card
        title="Aktivitas terakhir"
        subtitle="Lima perubahan terbaru pada pendaftaran pemasok"
        style={{ marginTop: 'var(--sp-5)' }}
      >
        <ul className="timeline">
          {recent.map((submission) => {
            const last = submission.timeline[submission.timeline.length - 1];
            return (
              <li key={submission.id}>
                <span className="row" style={{ gap: 'var(--sp-2)' }}>
                  <strong>{submission.general.vendorName}</strong>
                  <StatusBadge status={submission.status} />
                </span>
                <time dateTime={last.at}>
                  {last.label} · {formatDate(last.at)} · {last.actor}
                </time>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
