import { useId, useState } from 'react';
import Icon from './Icon.jsx';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Isian kata sandi dengan tombol lihat/sembunyikan.
 * Tombol berada di dalam kotak isian dan tetap dapat dicapai keyboard;
 * keadaannya diumumkan lewat aria-pressed sehingga pembaca layar tahu
 * apakah kata sandi sedang terlihat.
 */
export default function PasswordField({
  label,
  hint,
  error,
  required,
  id,
  value,
  onChange,
  showLabel,
  hideLabel,
  ...rest
}) {
  const t = useT();
  const auto = useId();
  const base = id ?? auto;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const [visible, setVisible] = useState(false);
  const showText = showLabel ?? t('password.show');
  const hideText = hideLabel ?? t('password.hide');

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={base}>
          {label}
          {required && (
            <span className="field__req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="password">
        <input
          id={base}
          type={visible ? 'text' : 'password'}
          className="input password__input"
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          required={required}
          {...rest}
        />
        <button
          type="button"
          className="password__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={base}
          aria-label={visible ? hideText : showText}
          title={visible ? hideText : showText}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={hintId}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
