import { useRef } from 'react';

/**
 * Tab dengan navigasi panah kiri/kanan sesuai pola WAI-ARIA.
 * `visited` menandai tab yang sudah dibuka — dipakai pada layar tinjau
 * pengajuan, karena tombol keputusan baru aktif setelah semua tab dilihat.
 */
export default function Tabs({ items, active, onChange, visited = [] }) {
  const refs = useRef([]);

  function handleKeyDown(event, index) {
    const last = items.length - 1;
    let next = null;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="tabs" role="tablist">
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${item.id}`}
          aria-selected={active === item.id}
          aria-controls={`panel-${item.id}`}
          tabIndex={active === item.id ? 0 : -1}
          className="tabs__btn"
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {item.label}
          {visited.includes(item.id) && (
            <>
              <span className="dot" aria-hidden="true" />
              <span className="visually-hidden">sudah ditinjau</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, active, children }) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={-1}>
      {children}
    </div>
  );
}
