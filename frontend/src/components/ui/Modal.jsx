import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog modal dengan perilaku yang diharapkan keyboard:
 * fokus berpindah ke dalam saat dibuka, Tab berputar di dalam dialog,
 * Escape menutup, dan fokus kembali ke pemicu saat ditutup.
 */
export default function Modal({ open, onClose, title, description, children, footer }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    const node = dialogRef.current;
    node?.querySelector(FOCUSABLE)?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = Array.from(node?.querySelectorAll(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className="modal__body">
          <h2 id={titleId} className="card__title">
            {title}
          </h2>
          {description && (
            <p id={descId} className="card__sub" style={{ marginBottom: 'var(--sp-4)' }}>
              {description}
            </p>
          )}
          {children}
          {footer && <div className="modal__actions">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
