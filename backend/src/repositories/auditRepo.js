import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';

/**
 * Jejak audit. Ditulis di sisi server, bukan dititipkan ke klien: catatan
 * yang bisa dilewati pemanggilnya tidak berguna saat ditelusuri kemudian.
 */
export function record({
  actor,
  action,
  objectType,
  objectId,
  previousValue = null,
  newValue = null,
  id,
  at,
}) {
  const db = getDb();
  const entry = {
    id: id ?? makeId('log'),
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? 'Sistem',
    action,
    objectType,
    objectId: objectId ?? null,
    previousValue: previousValue === null ? null : String(previousValue),
    newValue: newValue === null ? null : String(newValue),
    at: at ?? now(),
  };

  db.prepare(
    `INSERT INTO audit_log
       (id, actor_id, actor_name, action, object_type, object_id, previous_value, new_value, at)
     VALUES (@id, @actorId, @actorName, @action, @objectType, @objectId, @previousValue, @newValue, @at)
     ON CONFLICT (id) DO NOTHING`,
  ).run(entry);

  return entry;
}

export function list({ objectType, objectId, action, limit = 200 } = {}) {
  const db = getDb();
  const where = [];
  const params = {};

  if (objectType) {
    where.push('object_type = @objectType');
    params.objectType = objectType;
  }
  if (objectId) {
    where.push('object_id = @objectId');
    params.objectId = objectId;
  }
  if (action) {
    where.push('action = @action');
    params.action = action;
  }

  const rows = db
    .prepare(
      `SELECT * FROM audit_log
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY at DESC, rowid DESC
       LIMIT @limit`,
    )
    .all({ ...params, limit: Math.min(Number(limit) || 200, 1000) });

  return rows.map(toDomain);
}

export function toDomain(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    objectType: row.object_type,
    objectId: row.object_id,
    previousValue: row.previous_value,
    newValue: row.new_value,
    at: row.at,
  };
}
