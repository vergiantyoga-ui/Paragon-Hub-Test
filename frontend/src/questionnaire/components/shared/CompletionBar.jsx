import './completion-bar.css';

/** Bilah kemajuan pengisian, dengan nilai yang juga terbaca pembaca layar. */
export default function CompletionBar({ percent, label }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent ?? 0)));

  return (
    <div className="completion">
      <div
        className="completion__track"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Kemajuan pengisian'}
      >
        <div className="completion__fill" style={{ width: `${safe}%` }} />
      </div>
      <span className="completion__value">{safe}%</span>
    </div>
  );
}
