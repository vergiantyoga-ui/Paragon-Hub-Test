import { TextField, Checkbox } from '../../../components/ui/Field.jsx';

/**
 * Pengaturan skoring tingkat versi.
 *
 * Skoring bersifat opsional per kuesioner: pernyataan seperti Animal Free
 * Statement hanya memerlukan deklarasi dan dokumen, tanpa nilai. Karena itu
 * mematikan sakelar ini menyembunyikan seluruh kolom bobot dan skor pada
 * builder, bukan sekadar menghentikan perhitungan.
 */
export default function ScoringPanel({ version, readOnly, onUpdate, onUpdateBand }) {
  return (
    <div className="stack">
      <Checkbox
        checked={version.scoringEnabled}
        disabled={readOnly}
        onChange={(checked) => onUpdate({ scoringEnabled: checked })}
      >
        Aktifkan skoring dan klasifikasi risiko
      </Checkbox>

      {!version.scoringEnabled ? (
        <p className="field__hint">
          Bobot dan skor yang sudah diisi tetap tersimpan, sehingga mengaktifkan
          kembali tidak berarti menyusun ulang dari nol.
        </p>
      ) : (
        <>
          <TextField
            label="Nilai kelulusan"
            type="number"
            min="0"
            max="100"
            value={version.passingScore ?? ''}
            onChange={(e) =>
              onUpdate({ passingScore: e.target.value === '' ? null : Number(e.target.value) })
            }
            disabled={readOnly}
            hint="Kosongkan bila kuesioner ini tidak mengenal lulus atau gagal."
          />

          <div>
            <h3 className="props__subtitle">Klasifikasi risiko</h3>
            <p className="field__hint" style={{ marginBottom: 'var(--sp-3)' }}>
              Rentang dinyatakan dalam persentase skor akhir.
            </p>

            <table className="bandtable">
              <thead>
                <tr>
                  <th scope="col">Sebutan</th>
                  <th scope="col">Dari</th>
                  <th scope="col">Sampai</th>
                  <th scope="col">Tingkat risiko</th>
                </tr>
              </thead>
              <tbody>
                {version.riskBands.map((band) => (
                  <tr key={band.id}>
                    <td>
                      <input
                        className="input"
                        value={band.label}
                        onChange={(e) => onUpdateBand(band.id, { label: e.target.value })}
                        disabled={readOnly}
                        aria-label={`Sebutan untuk ${band.label}`}
                      />
                    </td>
                    <td>
                      <input
                        className="input bandtable__num"
                        type="number"
                        value={band.min}
                        onChange={(e) => onUpdateBand(band.id, { min: Number(e.target.value) })}
                        disabled={readOnly}
                        aria-label={`Batas bawah ${band.label}`}
                      />
                    </td>
                    <td>
                      <input
                        className="input bandtable__num"
                        type="number"
                        value={band.max}
                        onChange={(e) => onUpdateBand(band.id, { max: Number(e.target.value) })}
                        disabled={readOnly}
                        aria-label={`Batas atas ${band.label}`}
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={band.risk}
                        onChange={(e) => onUpdateBand(band.id, { risk: e.target.value })}
                        disabled={readOnly}
                        aria-label={`Tingkat risiko ${band.label}`}
                      >
                        <option value="low">Rendah</option>
                        <option value="medium">Sedang</option>
                        <option value="high">Tinggi</option>
                        <option value="critical">Kritis</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
