import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';

/**
 * Kualifikasi komoditas. Satu baris `qualification` per pemasok, dengan
 * baris-baris pasangan komoditas–negara di tabel terpisah.
 */

export function findAll() {
  const db = getDb();
  const heads = db.prepare('SELECT * FROM qualification').all();
  const out = {};
  for (const head of heads) out[head.supplier_id] = toDomain(head, linesOf(head.supplier_id));
  return out;
}

export function findBySupplier(supplierId) {
  const db = getDb();
  const head = db.prepare('SELECT * FROM qualification WHERE supplier_id = ?').get(supplierId);
  return head ? toDomain(head, linesOf(supplierId)) : null;
}

function linesOf(supplierId) {
  return getDb()
    .prepare('SELECT * FROM qualification_line WHERE supplier_id = ? ORDER BY order_index')
    .all(supplierId);
}

function toDomain(head, lines) {
  return {
    lines: lines.map((row) => ({
      id: row.id,
      segmentCode: row.segment_code ?? '',
      commodityCode: row.commodity_code ?? '',
      countryCode: row.country_code ?? '',
      notes: row.notes ?? '',
    })),
    status: head.status,
    updatedAt: head.updated_at,
    updatedBy: head.updated_by ?? '',
  };
}

/**
 * Menyimpan kualifikasi utuh. Baris yang seluruhnya kosong dibuang di sini
 * juga, bukan hanya di antarmuka: baris sisa saat mengisi bukan data.
 */
export function save(supplierId, { lines = [], status = 'draft', updatedBy = '' }) {
  const db = getDb();
  const kept = lines.filter(
    (line) => line.commodityCode || line.countryCode || line.notes?.trim(),
  );

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO qualification (supplier_id, status, updated_at, updated_by)
       VALUES (@supplierId, @status, @updatedAt, @updatedBy)
       ON CONFLICT (supplier_id) DO UPDATE SET
         status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    ).run({ supplierId, status, updatedAt: now(), updatedBy });

    db.prepare('DELETE FROM qualification_line WHERE supplier_id = ?').run(supplierId);

    const insert = db.prepare(
      `INSERT INTO qualification_line
         (id, supplier_id, segment_code, commodity_code, country_code, notes, order_index)
       VALUES (@id, @supplierId, @segmentCode, @commodityCode, @countryCode, @notes, @order)`,
    );

    kept.forEach((line, index) =>
      insert.run({
        id: line.id ?? makeId('qln'),
        supplierId,
        segmentCode: line.segmentCode ?? null,
        commodityCode: line.commodityCode ?? null,
        countryCode: line.countryCode ?? null,
        notes: line.notes ?? null,
        order: index,
      }),
    );
  });

  run();
  return findBySupplier(supplierId);
}
