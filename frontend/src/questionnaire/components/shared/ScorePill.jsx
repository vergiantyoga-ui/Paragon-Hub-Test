/** Menampilkan skor beserta klasifikasinya; kosong bila skoring dimatikan. */
export default function ScorePill({ score }) {
  if (!score || score.total === null) {
    return <span className="pill pill--neutral">Tanpa skor</span>;
  }

  const tone =
    score.riskLevel === 'low' ? 'success' : score.riskLevel === 'medium' ? 'pending' : 'danger';

  return (
    <span className={`pill pill--${tone}`}>
      {score.total}
      {score.band ? ` · ${score.band.label}` : ''}
    </span>
  );
}
