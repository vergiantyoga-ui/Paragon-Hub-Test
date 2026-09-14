/**
 * Rail progres untuk wizard profil. Berbentuk daftar vertikal, bukan
 * stepper horizontal, karena kelima bagian boleh dikerjakan dalam urutan
 * bebas dan pemasok perlu melihat mana yang masih kosong sekaligus.
 */
import { useT } from '../../i18n/LanguageContext.jsx';

export default function SectionRail({ sections, active, completed = {}, onSelect, groups }) {
  if (groups?.length) {
    return (
      <nav aria-label="Bagian profil">
        {groups.map((group) => (
          <div className="rail-group" key={group.id}>
            <p className="rail-group__label">{group.label}</p>
            <List
              sections={sections.filter((s) => s.group === group.id)}
              active={active}
              completed={completed}
              onSelect={onSelect}
            />
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Bagian profil">
      <List sections={sections} active={active} completed={completed} onSelect={onSelect} />
    </nav>
  );
}

function List({ sections, active, completed, onSelect }) {
  const t = useT();
  return (
      <ol className="rail">
        {sections.map((section) => {
          const isDone = Boolean(completed[section.id]);
          const isCurrent = section.id === active;
          return (
            <li
              key={section.id}
              className={[
                'rail__item',
                isDone ? 'rail__item--done' : '',
                isCurrent ? 'rail__item--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="rail__mark" aria-hidden="true">
                {isDone ? '✓' : ''}
              </span>
              <button
                type="button"
                className="rail__btn"
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(section.id)}
              >
                {t(`section.${section.id}`)}
                <span className="rail__meta">
                  {isDone ? t('common.done') : t(`section.${section.id}.hint`)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
  );
}
