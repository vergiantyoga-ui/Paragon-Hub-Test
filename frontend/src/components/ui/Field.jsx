import { useId } from 'react';

/**
 * Pembungkus field: label, pesan bantuan, dan pesan galat terhubung
 * ke input lewat aria-describedby sehingga terbaca screen reader.
 */
function FieldShell({ label, hint, error, required: isRequired, htmlFor, ids, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {isRequired && (
            <span className="field__req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="field__hint" id={ids.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={ids.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function useFieldIds(id) {
  const auto = useId();
  const base = id ?? auto;
  return { base, hint: `${base}-hint`, error: `${base}-error` };
}

function describedBy(ids, hint, error) {
  const parts = [];
  if (hint && !error) parts.push(ids.hint);
  if (error) parts.push(ids.error);
  return parts.length ? parts.join(' ') : undefined;
}

export function TextField({ label, hint, error, required, id, ...rest }) {
  const ids = useFieldIds(id);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={ids.base}
      ids={ids}
    >
      <input
        id={ids.base}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, required, id, options = [], placeholder, ...rest }) {
  const ids = useFieldIds(id);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={ids.base}
      ids={ids}
    >
      <select
        id={ids.base}
        className="select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        required={required}
        {...rest}
      >
        <option value="">{placeholder ?? 'Pilih salah satu'}</option>
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, required, id, ...rest }) {
  const ids = useFieldIds(id);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={ids.base}
      ids={ids}
    >
      <textarea
        id={ids.base}
        className="textarea"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function Checkbox({ label, checked, onChange, id, disabled, children }) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <label className="checkbox" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{children ?? label}</span>
    </label>
  );
}

/** Kelompok checkbox dengan fieldset agar hubungan label terbaca dengan benar. */
export function CheckboxGroup({ legend, options, values = [], onChange, error }) {
  return (
    <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="field__label">{legend}</legend>
      <div className="stack-sm">
        {options.map((option) => (
          <Checkbox
            key={option}
            label={option}
            checked={values.includes(option)}
            onChange={(next) =>
              onChange(next ? [...values, option] : values.filter((v) => v !== option))
            }
          />
        ))}
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
