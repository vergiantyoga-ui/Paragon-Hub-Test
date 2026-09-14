import { useId, useRef, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { formatBytes } from '../../../lib/validation.js';
import { getType } from '../../engine/index.js';
import './renderer.css';

/**
 * Merender satu pertanyaan sesuai tipenya.
 *
 * Percabangan tipe soal hanya ada di berkas ini. Menambah tipe baru berarti
 * menambah satu entri pada registri `questionTypes.js` dan satu cabang di sini;
 * tidak ada tempat lain yang perlu tahu daftar tipe.
 */
export default function QuestionRenderer({
  question,
  value,
  files = [],
  error,
  readOnly,
  comments = [],
  highlighted = false,
  onChange,
  onFilesChange,
}) {
  const type = getType(question.type);
  const labelId = `q-${question.id}-label`;

  return (
    <div
      className={[
        'qfield',
        error ? 'qfield--error' : '',
        highlighted ? 'qfield--flagged' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="qfield__head">
        <p className="qfield__label" id={labelId}>
          {question.text}
          {question.required && (
            <span className="field__req" aria-hidden="true">
              *
            </span>
          )}
        </p>
        {question.code && <span className="qfield__code">{question.code}</span>}
      </div>

      {question.guidance && <p className="qfield__guidance">{question.guidance}</p>}

      {comments.length > 0 && (
        <div className="qfield__comments">
          <p className="qfield__commentstitle">Catatan peninjau</p>
          {comments.map((item, index) => (
            <p key={index} className="text-sm">
              {item.comment}
              <span className="muted"> — {item.reviewer}, putaran {item.revision}</span>
            </p>
          ))}
        </div>
      )}

      <Input
        question={question}
        type={type}
        value={value}
        readOnly={readOnly}
        labelId={labelId}
        onChange={onChange}
      />

      {question.attachmentRule && (
        <AttachmentField
          question={question}
          files={files}
          readOnly={readOnly}
          onChange={onFilesChange}
        />
      )}

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Input({ question, type, value, readOnly, labelId, onChange }) {
  const common = { disabled: readOnly, 'aria-labelledby': labelId };

  switch (question.type) {
    case 'short_text':
      return (
        <input
          className="input"
          value={value ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );

    case 'long_text':
      return (
        <textarea
          className="textarea"
          rows={4}
          value={value ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );

    case 'single_choice':
    case 'yes_no':
    case 'yes_no_na':
      return (
        <div className="choices" role="radiogroup" aria-labelledby={labelId}>
          {question.options.map((option) => (
            <label key={option.id} className="choice">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === option.value}
                disabled={readOnly}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="choices" role="group" aria-labelledby={labelId}>
          {question.options.map((option) => (
            <label key={option.id} className="choice">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'dropdown':
      return (
        <select
          className="select"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        >
          <option value="">Pilih salah satu</option>
          {question.options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'number':
    case 'currency':
      return (
        <input
          className="input"
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );

    case 'percentage':
      return (
        <div className="suffixed">
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            {...common}
          />
          <span className="suffixed__unit">%</span>
        </div>
      );

    case 'date':
      return (
        <input
          className="input"
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );

    case 'date_range':
      return (
        <div className="daterange">
          <input
            className="input"
            type="date"
            value={value?.from ?? ''}
            onChange={(e) => onChange({ ...(value ?? {}), from: e.target.value })}
            disabled={readOnly}
            aria-label="Tanggal mulai"
          />
          <span aria-hidden="true">—</span>
          <input
            className="input"
            type="date"
            value={value?.to ?? ''}
            onChange={(e) => onChange({ ...(value ?? {}), to: e.target.value })}
            disabled={readOnly}
            aria-label="Tanggal akhir"
          />
        </div>
      );

    case 'rating':
      return <RatingInput question={question} value={value} readOnly={readOnly} onChange={onChange} />;

    case 'score':
      return (
        <input
          className="input"
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );

    case 'statement':
      return null; // teksnya sudah tampil sebagai label dan panduan

    case 'signature':
      return <SignaturePad value={value} readOnly={readOnly} onChange={onChange} />;

    case 'file_single':
    case 'file_multiple':
      return null; // ditangani sepenuhnya oleh AttachmentField

    case 'matrix':
      return (
        <p className="qfield__todo">
          Tipe tabel belum tersedia pada antarmuka pengisian. Sementara ini gunakan
          teks panjang atau lampiran.
        </p>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

function RatingInput({ question, value, readOnly, onChange }) {
  const max = question.validation?.max ?? 5;
  const scale = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <div className="rating" role="radiogroup" aria-label="Skala penilaian">
      {scale.map((point) => (
        <label key={point} className={`rating__dot ${Number(value) === point ? 'rating__dot--on' : ''}`.trim()}>
          <input
            type="radio"
            name={`q-${question.id}`}
            className="visually-hidden"
            checked={Number(value) === point}
            disabled={readOnly}
            onChange={() => onChange(point)}
          />
          {point}
        </label>
      ))}
    </div>
  );
}

/**
 * Tanda tangan berupa kanvas gambar tangan.
 * Ini bukan tanda tangan elektronik tersertifikasi; bila keabsahan hukum
 * diperlukan, penyedia pihak ketiga harus disambungkan di sisi server.
 */
function SignaturePad({ value, readOnly, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  function pos(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function start(event) {
    if (readOnly) return;
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing.current || readOnly) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(event);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange({ dataUrl: canvasRef.current.toDataURL('image/png'), signedAt: new Date().toISOString() });
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div className="signature">
      {value?.dataUrl && readOnly ? (
        <img src={value.dataUrl} alt="Tanda tangan yang sudah dibubuhkan" className="signature__img" />
      ) : (
        <canvas
          ref={canvasRef}
          width={420}
          height={140}
          className="signature__pad"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          aria-label="Area tanda tangan"
        />
      )}

      {!readOnly && (
        <div className="row">
          <Button variant="secondary" size="sm" onClick={clear}>
            Hapus tanda tangan
          </Button>
          <span className="text-xs muted">
            Bubuhkan tanda tangan dengan tetikus atau jari.
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Unggahan berkas mengikuti aturan lampiran pertanyaan: jumlah, ukuran,
 * format, dan tanggal berlaku. Validasi dilakukan saat memilih berkas agar
 * pemasok tahu penolakannya sebelum menekan simpan.
 */
function AttachmentField({ question, files, readOnly, onChange }) {
  const rule = question.attachmentRule;
  const inputRef = useRef(null);
  const inputId = useId();
  const [localError, setLocalError] = useState(null);

  const labelOf = (mime) =>
    ({ 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' })[mime] ?? mime;

  function handleSelect(event) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    if (files.length + picked.length > rule.maxFiles) {
      setLocalError(`Maksimal ${rule.maxFiles} berkas.`);
      event.target.value = '';
      return;
    }

    for (const file of picked) {
      if (!rule.allowedTypes.includes(file.type)) {
        setLocalError(`Format ${file.name} tidak diterima.`);
        event.target.value = '';
        return;
      }
      if (file.size > rule.maxFileSizeMb * 1024 * 1024) {
        setLocalError(`${file.name} melebihi ${rule.maxFileSizeMb} MB.`);
        event.target.value = '';
        return;
      }
    }

    setLocalError(null);
    onChange([
      ...files,
      ...picked.map((file) => ({
        id: `att_${Math.random().toString(36).slice(2, 9)}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        expiryDate: null,
        uploadedAt: new Date().toISOString(),
      })),
    ]);
    event.target.value = '';
  }

  return (
    <div className="attach">
      <p className="attach__title">
        Dokumen pendukung
        {rule.required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </p>

      {files.map((file) => (
        <div className="attach__item" key={file.id}>
          <div className="attach__meta">
            <span className="attach__name">{file.fileName}</span>
            <span className="text-xs muted">{formatBytes(file.fileSize)}</span>
          </div>

          {rule.expiryDateRequired && (
            <div className="attach__expiry">
              <label className="text-xs muted" htmlFor={`${inputId}-${file.id}`}>
                Berlaku sampai
              </label>
              <input
                id={`${inputId}-${file.id}`}
                type="date"
                className="input"
                value={file.expiryDate ?? ''}
                disabled={readOnly}
                onChange={(event) =>
                  onChange(
                    files.map((item) =>
                      item.id === file.id ? { ...item, expiryDate: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              className="iconbtn iconbtn--danger"
              onClick={() => onChange(files.filter((item) => item.id !== file.id))}
              aria-label={`Hapus ${file.fileName}`}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      ))}

      {!readOnly && files.length < rule.maxFiles && (
        <>
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {files.length === 0 ? 'Pilih berkas' : 'Tambah berkas'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="visually-hidden"
            multiple={rule.maxFiles > 1}
            accept={rule.allowedTypes.join(',')}
            onChange={handleSelect}
            aria-label={`Unggah dokumen untuk ${question.text}`}
          />
        </>
      )}

      <p className={localError ? 'field__error' : 'field__hint'} role={localError ? 'alert' : undefined}>
        {localError ??
          `${rule.allowedTypes.map(labelOf).join(', ')} · maksimal ${rule.maxFileSizeMb} MB · sampai ${rule.maxFiles} berkas`}
      </p>
    </div>
  );
}

export { AttachmentField };
