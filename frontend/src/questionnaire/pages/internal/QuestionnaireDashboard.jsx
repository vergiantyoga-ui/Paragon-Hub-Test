import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { BarChart, DonutChart, GaugeChart } from '../../components/shared/Charts.jsx';
import { useQuestionnaireState, assignmentView } from '../../store/QuestionnaireStore.jsx';
import {
  aggregateSupplierScore,
  calculateScore,
  responseRate,
  riskDistribution,
  summarise,
} from '../../engine/index.js';
import './dashboard.css';

/** Ringkasan angka dan sebaran untuk seluruh modul kuesioner. */
export default function QuestionnaireDashboard() {
  const state = useQuestionnaireState();
  const kpi = summarise(state);

  const scored = state.responses
    .map((response) => {
      const view = assignmentView(state, response.assignmentId);
      if (!view?.version) return null;
      return { response, view, score: calculateScore(view.version, response.answers) };
    })
    .filter(Boolean);

  const risks = riskDistribution(scored.map((item) => item.score));
  const average = aggregateSupplierScore(scored.map((item) => item.score));

  // Sebaran menurut tipe kuesioner, dihitung dari template yang ada.
  const byType = Object.entries(
    state.templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));

  const KPIS = [
    { label: 'Template', value: kpi.templates },
    { label: 'Draf', value: kpi.draft },
    { label: 'Terbit', value: kpi.published },
    { label: 'Ditugaskan', value: kpi.assigned },
    { label: 'Belum dimulai', value: kpi.notStarted },
    { label: 'Sedang diisi', value: kpi.inProgress },
    { label: 'Terkirim', value: kpi.submitted },
    { label: 'Ditinjau', value: kpi.underReview },
    { label: 'Perlu revisi', value: kpi.revisionRequired, tone: 'danger' },
    { label: 'Disetujui', value: kpi.approved, tone: 'success' },
    { label: 'Ditolak', value: kpi.rejected, tone: 'danger' },
    { label: 'Terlambat', value: kpi.overdue, tone: 'danger' },
  ];

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: '/internal/beranda' }, { label: 'Dashboard kuesioner' }]}
        icon="home"
        title="Dashboard kuesioner"
        description="Ringkasan template, penugasan, dan hasil penilaian pemasok."
        actions={<Button variant="secondary" to="/internal/penugasan">Buka penugasan</Button>}
      />

      <ul className="kpis">
        {KPIS.map((item) => (
          <li key={item.label} className={`kpi ${item.tone && item.value > 0 ? `kpi--${item.tone}` : ''}`.trim()}>
            <span className="kpi__value">{item.value}</span>
            <span className="kpi__label">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="dashgrid">
        <Card>
          <GaugeChart
            title="Tingkat respons pemasok"
            percent={responseRate(state.assignments, state.responses)}
            caption="Bagian penugasan yang sudah dikirim pemasok untuk ditinjau."
          />
        </Card>

        <Card>
          <DonutChart
            title="Sebaran risiko"
            centerLabel="respons"
            data={[
              { id: 'low', label: 'Risiko rendah', value: risks.low },
              { id: 'medium', label: 'Risiko sedang', value: risks.medium },
              { id: 'high', label: 'Risiko tinggi', value: risks.high },
              { id: 'critical', label: 'Risiko kritis', value: risks.critical },
              { id: 'unscored', label: 'Tanpa skor', value: risks.unscored },
            ]}
          />
        </Card>

        <Card>
          <BarChart title="Sebaran tipe kuesioner" data={byType} />
        </Card>

        <Card>
          <BarChart
            title="Status pengisian"
            data={[
              { label: 'Belum dimulai', value: kpi.notStarted },
              { label: 'Sedang diisi', value: kpi.inProgress },
              { label: 'Terkirim', value: kpi.submitted },
              { label: 'Perlu revisi', value: kpi.revisionRequired },
              { label: 'Disetujui', value: kpi.approved },
            ]}
          />
        </Card>
      </div>

      <Card
        title="Skor pemasok"
        subtitle={
          average === null
            ? 'Belum ada respons berskor.'
            : `Rata-rata keseluruhan ${average} dari kuesioner yang memakai skoring.`
        }
        style={{ marginTop: 'var(--sp-4)' }}
      >
        {scored.filter((item) => item.score?.total !== null && item.score !== null).length === 0 ? (
          <p className="text-sm muted">
            Kuesioner yang sudah dikirim belum ada yang memakai skoring, jadi belum ada nilai
            untuk dirangkum.
          </p>
        ) : (
          <BarChart
            title="Skor per respons"
            unit=""
            data={scored
              .filter((item) => item.score && item.score.total !== null)
              .map((item) => ({
                label: item.view.assignment.supplierName,
                value: item.score.total,
                color:
                  item.score.riskLevel === 'low'
                    ? '#15803d'
                    : item.score.riskLevel === 'medium'
                      ? '#a16207'
                      : '#b91c1c',
              }))}
          />
        )}
      </Card>
    </>
  );
}
