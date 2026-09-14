import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import DataList from '../../components/ui/DataList.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAppActions, useAppState } from '../../store/AppStore.jsx';
import {
  QUALIFICATION_STATUS,
  canFillQualification,
  ineligibilityReason,
  isEligible,
  makeLine,
  meaningfulLines,
  validateLines,
} from '../qualificationRules.js';
import { COUNTRIES, commoditiesBySegment, segmentNameOf } from '../data/referenceData.js';
import { formatDate } from '../../lib/format.js';
import './qualification.css';
import { VENDOR_TYPES, labelOf } from '../../lib/masterData.js';

/**
 * Pengisian kualifikasi pemasok.
 *
 * Satu baris mewakili satu pasangan komoditas dan negara asal; pemasok yang
 * memasok beberapa komoditas atau dari beberapa negara cukup menambah baris.
 * Menyimpan sebagai draf tidak menuntut kelengkapan, sedangkan menyelesaikan
 * menuntut seluruh baris terisi sah.
 */
export default function QualificationForm() {
  const { supplierId } = useParams();
  const { submissions, qualifications, session } = useAppState();
  const { saveQualification } = useAppActions();
  const toast = useToast();
  const navigate = useNavigate();

  const submission = submissions.find((item) => item.id === supplierId);
  const existing = qualifications[supplierId];

  const [lines, setLines] = useState(() =>
    existing?.lines?.length ? existing.lines : [makeLine()],
  );
  const [errors, setErrors] = useState({});

  if (!submission) return <Navigate to="/internal/kualifikasi" replace />;

  const user = session?.user;
  const editable = canFillQualification(user) && isEligible(submission);
  const groups = commoditiesBySegment();
  const filled = meaningfulLines(lines);

  const update = (id, patch) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  const addLine = () => setLines((current) => [...current, makeLine()]);

  const addLines = (count) =>
    setLines((current) => [...current, ...Array.from({ length: count }, () => makeLine())]);

  const removeLine = (id) =>
    setLines((current) => {
      const next = current.filter((line) => line.id !== id);
      return next.length > 0 ? next : [makeLine()];
    });

  /** Menyalin baris memudahkan mendaftarkan komoditas sama dari negara berbeda. */
  const duplicateLine = (id) =>
    setLines((current) => {
      const index = current.findIndex((line) => line.id === id);
      if (index === -1) return current;
      const copy = makeLine({ ...current[index], id: undefined, countryCode: '' });
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });

  function save(status) {
    const found = validateLines(lines);

    if (status === QUALIFICATION_STATUS.COMPLETED) {
      if (filled.length === 0) {
        toast.error('Tambahkan minimal satu baris sebelum menyelesaikan kualifikasi.');
        return;
      }
      if (Object.keys(found).length > 0) {
        setErrors(found);
        document.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
    }

    setErrors(found);
    saveQualification(supplierId, lines, status, user);
    toast.success(
      status === QUALIFICATION_STATUS.COMPLETED
        ? 'Kualifikasi pemasok selesai.'
        : 'Draf kualifikasi tersimpan.',
    );
    if (status === QUALIFICATION_STATUS.COMPLETED) navigate('/internal/kualifikasi');
  }

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Beranda', to: '/internal/beranda' },
          { label: 'Kualifikasi', to: '/internal/kualifikasi' },
          { label: submission.general.vendorName },
        ]}
        icon="verify"
        title={submission.general.vendorName}
        description="Tentukan kategori komoditas UNSPSC dan negara asal pasokan. Tambahkan baris untuk setiap kombinasi."
      />

      {!isEligible(submission) && (
        <div className="notice notice--warn" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">Pemasok belum layak dikualifikasi</span>
          {ineligibilityReason(submission)}
        </div>
      )}

      {isEligible(submission) && !canFillQualification(user) && (
        <div className="notice notice--info" style={{ marginBottom: 'var(--sp-4)' }}>
          <span className="notice__title">Mode baca</span>
          Pengisian kualifikasi dilakukan staf procurement. Anda dapat meninjau isinya di sini.
        </div>
      )}

      <div className="qual__layout">
        <Card
          title="Baris kualifikasi"
          subtitle={`${filled.length} baris terisi`}
          actions={
            editable && (
              <div className="row">
                <Button variant="secondary" size="sm" onClick={() => addLines(5)}>
                  Tambah 5 baris
                </Button>
                <Button size="sm" onClick={addLine}>
                  Tambah baris
                </Button>
              </div>
            )
          }
        >
          <div className="qual__tablewrap">
            <table className="qual__table">
              <caption className="visually-hidden">
                Daftar komoditas dan negara asal pasokan
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="qual__num">
                    #
                  </th>
                  <th scope="col">Kategori komoditas (UNSPSC)</th>
                  <th scope="col">Negara pemasok</th>
                  <th scope="col">Catatan</th>
                  {editable && <th scope="col" className="visually-hidden">Tindakan</th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const lineErrors = errors[line.id] ?? {};

                  return (
                    <tr key={line.id}>
                      <td className="qual__num">{index + 1}</td>

                      <td>
                        <select
                          className="select"
                          value={line.commodityCode}
                          disabled={!editable}
                          aria-label={`Kategori komoditas baris ${index + 1}`}
                          aria-invalid={lineErrors.commodityCode ? 'true' : undefined}
                          onChange={(event) => update(line.id, { commodityCode: event.target.value })}
                        >
                          <option value="">Pilih komoditas</option>
                          {groups.map((group) => (
                            <optgroup key={group.code} label={`${group.code} — ${group.name}`}>
                              {group.commodities.map((commodity) => (
                                <option key={commodity.code} value={commodity.code}>
                                  {commodity.code} — {commodity.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {line.commodityCode && !lineErrors.commodityCode && (
                          <p className="qual__hint">{segmentNameOf(line.commodityCode)}</p>
                        )}
                        {lineErrors.commodityCode && (
                          <p className="field__error" role="alert">
                            {lineErrors.commodityCode}
                          </p>
                        )}
                      </td>

                      <td>
                        <select
                          className="select"
                          value={line.countryCode}
                          disabled={!editable}
                          aria-label={`Negara pemasok baris ${index + 1}`}
                          aria-invalid={lineErrors.countryCode ? 'true' : undefined}
                          onChange={(event) => update(line.id, { countryCode: event.target.value })}
                        >
                          <option value="">Pilih negara</option>
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                        {lineErrors.countryCode && (
                          <p className="field__error" role="alert">
                            {lineErrors.countryCode}
                          </p>
                        )}
                      </td>

                      <td>
                        <input
                          className="input"
                          value={line.notes}
                          disabled={!editable}
                          placeholder="Opsional"
                          aria-label={`Catatan baris ${index + 1}`}
                          onChange={(event) => update(line.id, { notes: event.target.value })}
                        />
                      </td>

                      {editable && (
                        <td>
                          <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              className="iconbtn"
                              onClick={() => duplicateLine(line.id)}
                              aria-label={`Salin baris ${index + 1} untuk negara lain`}
                              title="Salin untuk negara lain"
                            >
                              <Icon name="copy" size={16} />
                            </button>
                            <button
                              type="button"
                              className="iconbtn iconbtn--danger"
                              onClick={() => removeLine(line.id)}
                              aria-label={`Hapus baris ${index + 1}`}
                              title="Hapus baris"
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editable && (
            <div className="form-actions">
              <Button variant="secondary" to="/internal/kualifikasi">
                Kembali
              </Button>
              <Button variant="secondary" onClick={() => save(QUALIFICATION_STATUS.DRAFT)}>
                Simpan draf
              </Button>
              <Button onClick={() => save(QUALIFICATION_STATUS.COMPLETED)}>
                Selesaikan kualifikasi
              </Button>
            </div>
          )}
        </Card>

        <aside className="stack">
          <Card title="Pemasok">
            <DataList
              items={[
                { label: 'Nomor', value: submission.id },
                { label: 'Jenis pasokan', value: labelOf(VENDOR_TYPES, submission.general.vendorType) },
                { label: 'Negara terdaftar', value: submission.address.country },
                { label: 'Aktif sejak', value: formatDate(submission.activatedAt) },
              ]}
            />
          </Card>

          {existing && (
            <Card title="Penyimpanan terakhir">
              <DataList
                items={[
                  { label: 'Oleh', value: existing.updatedBy },
                  { label: 'Waktu', value: formatDate(existing.updatedAt) },
                  { label: 'Baris tersimpan', value: String(existing.lines.length) },
                ]}
              />
            </Card>
          )}

          <Card title="Tentang kode UNSPSC">
            <p className="text-sm muted">
              Daftar ini memuat 42 komoditas yang relevan bagi manufaktur kosmetik, dikurasi
              dari taksonomi UNSPSC. Kode delapan digitnya belum dicocokkan dengan daftar
              resmi, jadi mintalah tim master data memverifikasinya sebelum dipakai untuk
              pengadaan.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
