import { useEffect, useRef, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import { useLanguage } from './LanguageContext.jsx';
import './language-menu.css';

/**
 * Pengalih bahasa pada bilah atas. Menu ditutup saat menekan Escape
 * atau mengklik di luar, dan pilihan yang berlaku ditandai aria-checked.
 */
export default function LanguageMenu() {
  const { lang, setLang, languages, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = languages.find((l) => l.code === lang);

  return (
    <div className="langmenu" ref={wrapRef}>
      <button
        type="button"
        className="langmenu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('shell.language')}: ${current?.label}`}
      >
        <Icon name="globe" size={18} />
        <span className="langmenu__short">{current?.short}</span>
      </button>

      {open && (
        <ul className="langmenu__list" role="menu">
          {languages.map((option) => (
            <li key={option.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option.code === lang}
                className="langmenu__item"
                onClick={() => {
                  setLang(option.code);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.code === lang && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
