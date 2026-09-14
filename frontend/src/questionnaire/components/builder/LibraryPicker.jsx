import { useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import { QUESTION_TYPES } from '../../engine/index.js';

/**
 * Pemilih dari pustaka soal atau pustaka seksi.
 *
 * Butir yang dipilih disalin nilainya ke dalam versi, bukan dirujuk. Menyunting
 * pustaka setelahnya tidak mengubah kuesioner yang sudah memakainya — aturan 13
 * dan 14 pada spesifikasi. Catatan itu ditampilkan langsung di panel supaya
 * penyusun tidak menduga sebaliknya.
 */
export default function LibraryPicker({
  open,
  mode, // 'question' | 'section'
  questionLibrary,
  sectionLibrary,
  onClose,
  onPickQuestion,
  onPickSection,
}) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  const questions = questionLibrary.filter(
    (item) =>
      !term ||
      item.question.text.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term),
  );

  const sections = sectionLibrary.filter((item) => !term || item.name.toLowerCase().includes(term));

  const categories = [...new Set(questions.map((item) => item.category))];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'section' ? 'Ambil seksi dari pustaka' : 'Ambil pertanyaan dari pustaka'}
      description="Butir yang dipilih disalin ke kuesioner ini. Perubahan pada pustaka setelahnya tidak memengaruhi salinan tersebut."
      footer={<Button variant="secondary" onClick={onClose}>Tutup</Button>}
    >
      <div className="field">
        <label className="field__label" htmlFor="lib-search">
          Cari
        </label>
        <input
          id="lib-search"
          type="search"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === 'section' ? 'Nama seksi' : 'Teks pertanyaan atau kategori'}
        />
      </div>

      {mode === 'section' ? (
        <ul className="libpick">
          {sections.map((section) => (
            <li key={section.id}>
              <div className="libpick__row">
                <div>
                  <p className="libpick__title">{section.name}</p>
                  <p className="libpick__meta">{section.questionIds.length} pertanyaan</p>
                </div>
                <Button size="sm" onClick={() => onPickSection(section)}>
                  Tambahkan
                </Button>
              </div>
            </li>
          ))}
          {sections.length === 0 && <p className="text-sm muted">Tidak ada yang cocok.</p>}
        </ul>
      ) : (
        <>
          {categories.map((category) => (
            <div key={category} className="libpick__group">
              <p className="libpick__category">{category}</p>
              <ul className="libpick">
                {questions
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <li key={item.id}>
                      <div className="libpick__row">
                        <div>
                          <p className="libpick__title">{item.question.text}</p>
                          <p className="libpick__meta">
                            {QUESTION_TYPES[item.question.type]?.label ?? item.question.type}
                            {item.question.attachmentRule?.required && ' · lampiran wajib'}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => onPickQuestion(item)}>
                          Tambahkan
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {questions.length === 0 && <p className="text-sm muted">Tidak ada yang cocok.</p>}
        </>
      )}
    </Modal>
  );
}
