import { TEMPLATE_STATUS } from '../../engine/schema.js';

const TONE = {
  [TEMPLATE_STATUS.DRAFT]: { tone: 'neutral', label: 'Draf' },
  [TEMPLATE_STATUS.PUBLISHED]: { tone: 'success', label: 'Terbit' },
  [TEMPLATE_STATUS.UNPUBLISHED]: { tone: 'pending', label: 'Ditarik' },
  [TEMPLATE_STATUS.ARCHIVED]: { tone: 'neutral', label: 'Diarsipkan' },
};

/** Status versi questionnaire, memakai gaya pill yang sama dengan aplikasi. */
export default function QuestionnaireStatusBadge({ status }) {
  const entry = TONE[status] ?? { tone: 'neutral', label: status };
  return <span className={`pill pill--${entry.tone}`}>{entry.label}</span>;
}
