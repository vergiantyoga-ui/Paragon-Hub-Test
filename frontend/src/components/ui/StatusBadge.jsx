import { STATUS_TONE } from '../../lib/constants.js';
import { useT } from '../../i18n/LanguageContext.jsx';

/** Pill status yang konsisten di konsol internal maupun portal pemasok. */
export default function StatusBadge({ status, className = '' }) {
  const t = useT();
  const tone = STATUS_TONE[status] ?? 'neutral';

  return (
    <span className={`pill pill--${tone} ${className}`.trim()}>{t(`status.${status}`)}</span>
  );
}
