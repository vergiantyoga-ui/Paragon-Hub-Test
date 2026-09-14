import Button from '../../../components/ui/Button.jsx';
import { listTypesByGroup } from '../../engine/index.js';

/**
 * Kotak perkakas. Menambah pertanyaan selalu memerlukan seksi tujuan, jadi
 * tombol tipe soal dinonaktifkan selama belum ada seksi terpilih — lebih jujur
 * daripada membiarkannya diklik lalu diam-diam tidak terjadi apa-apa.
 */
export default function QuestionToolbox({
  onAddSection,
  onAddQuestion,
  onPickSection,
  onPickQuestion,
  targetSectionName,
}) {
  const groups = listTypesByGroup();

  return (
    <aside className="toolbox" aria-label="Kotak perkakas">
      <Button block onClick={onAddSection}>
        Tambah seksi
      </Button>
      <Button block variant="secondary" size="sm" onClick={onPickSection} className="toolbox__lib">
        Ambil seksi dari pustaka
      </Button>

      <p className="toolbox__target">
        {targetSectionName ? (
          <>
            Pertanyaan baru masuk ke <strong>{targetSectionName}</strong>
          </>
        ) : (
          'Pilih sebuah seksi untuk menambahkan pertanyaan.'
        )}
      </p>

      <Button
        block
        variant="secondary"
        size="sm"
        onClick={onPickQuestion}
        disabled={!targetSectionName}
        className="toolbox__lib"
      >
        Ambil soal dari pustaka
      </Button>

      {groups.map((group) => (
        <div className="toolbox__group" key={group.id}>
          <p className="toolbox__label">{group.label}</p>
          <div className="toolbox__list">
            {group.types.map((type) => (
              <button
                key={type.id}
                type="button"
                className="toolbox__type"
                onClick={() => onAddQuestion(type.id)}
                disabled={!targetSectionName}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
