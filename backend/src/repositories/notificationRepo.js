import { getDb } from '../db/connection.js';
import { makeId, now } from '../lib/ids.js';
import { toBool, toInt } from '../lib/json.js';

/**
 * Notifikasi dalam aplikasi. Pengiriman email tetap di luar jangkauan —
 * yang tersimpan di sini adalah peristiwanya, sehingga menyambungkan
 * penyedia email kelak tidak perlu mengubah alur mana pun.
 */

export function list({ audience, unreadOnly } = {}) {
  const db = getDb();
  const where = [];
  const params = {};
  if (audience) {
    where.push('audience = @audience');
    params.audience = audience;
  }
  if (unreadOnly) where.push('read = 0');

  return db
    .prepare(
      `SELECT * FROM notification
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY at DESC`,
    )
    .all(params)
    .map(toDomain);
}

function toDomain(row) {
  return {
    id: row.id,
    event: row.event,
    audience: row.audience,
    title: row.title,
    body: row.body ?? '',
    link: row.link,
    read: toBool(row.read),
    at: row.at,
  };
}

export function save(notification) {
  const id = notification.id ?? makeId('ntf');
  getDb()
    .prepare(
      `INSERT INTO notification (id, event, audience, title, body, link, read, at)
       VALUES (@id, @event, @audience, @title, @body, @link, @read, @at)
       ON CONFLICT (id) DO UPDATE SET read = excluded.read`,
    )
    .run({
      id,
      event: notification.event,
      audience: notification.audience,
      title: notification.title,
      body: notification.body ?? null,
      link: notification.link ?? null,
      read: toInt(notification.read),
      at: notification.at ?? now(),
    });

  return { ...notification, id };
}

export function markRead(id) {
  return getDb().prepare('UPDATE notification SET read = 1 WHERE id = ?').run(id).changes > 0;
}

export function markAllRead(audience) {
  const db = getDb();
  return audience
    ? db.prepare('UPDATE notification SET read = 1 WHERE audience = ?').run(audience).changes
    : db.prepare('UPDATE notification SET read = 1').run().changes;
}
