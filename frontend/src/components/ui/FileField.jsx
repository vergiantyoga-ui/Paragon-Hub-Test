import { useId, useRef, useState } from 'react';
import Button from './Button.jsx';
import { ACCEPTED_FILE_LABEL } from '../../lib/constants.js';
import { formatBytes, validateFile } from '../../lib/validation.js';

/**
 * Unggah satu dokumen. Validasi format dan ukuran dijalankan di sini
 * supaya pemasok tahu berkasnya ditolak sebelum menekan simpan.
 * Tanpa backend, berkas hanya disimpan sebagai metadata.
 */
export default function FileField({ label, value, onChange, error, required, hint }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const shownError = error ?? localError;

  function handleSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setLocalError(problem);
      onChange(null);
      event.target.value = '';
      return;
    }
    setLocalError(null);
    onChange({ name: file.name, size: file.size, type: file.type });
  }

  function handleRemove() {
    setLocalError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const describedBy = shownError ? `${inputId}-error` : `${inputId}-hint`;

  return (
    <div className="field">
      <span className="field__label" id={`${inputId}-label`}>
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </span>

      <div className={`filefield ${value ? 'filefield--filled' : ''}`.trim()}>
        {value ? (
          <>
            <span className="filefield__meta">
              <span className="filefield__name">{value.name}</span>
              <br />
              {formatBytes(value.size)}
            </span>
            <div className="row">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Ganti berkas
              </Button>
              <Button variant="quiet" size="sm" onClick={handleRemove}>
                Hapus
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="filefield__meta">Belum ada berkas dipilih</span>
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
              Pilih berkas
            </Button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="visually-hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={describedBy}
        aria-invalid={shownError ? 'true' : undefined}
        onChange={handleSelect}
      />

      {shownError ? (
        <p className="field__error" id={`${inputId}-error`} role="alert">
          {shownError}
        </p>
      ) : (
        <p className="field__hint" id={`${inputId}-hint`}>
          {hint ?? ACCEPTED_FILE_LABEL}
        </p>
      )}
    </div>
  );
}
