import { getDb } from '../db/connection.js';
import { now } from '../lib/ids.js';
import { parseJson, toBool } from '../lib/json.js';

/* --------------------------- Pengguna internal --------------------------- */

export function listUsers() {
  return getDb()
    .prepare('SELECT id, name, email, role FROM internal_user WHERE active = 1 ORDER BY name')
    .all();
}

export function findUserByEmail(email) {
  return getDb()
    .prepare('SELECT * FROM internal_user WHERE lower(email) = lower(?) AND active = 1')
    .get(String(email).trim());
}

export function findUserById(id) {
  return getDb().prepare('SELECT * FROM internal_user WHERE id = ?').get(id);
}

export function saveUser(user) {
  getDb()
    .prepare(
      `INSERT INTO internal_user (id, name, email, role, password_hash, active, created_at)
       VALUES (@id, @name, @email, @role, @passwordHash, 1, @createdAt)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name, email = excluded.email, role = excluded.role`,
    )
    .run({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash ?? null,
      createdAt: now(),
    });
  return findUserById(user.id);
}

/* ------------------------------ Master data ------------------------------ */

export function listMaster(domain, { parentCode } = {}) {
  const db = getDb();
  const rows = parentCode
    ? db
        .prepare(
          'SELECT * FROM master_data WHERE domain = ? AND parent_code = ? AND active = 1 ORDER BY order_index',
        )
        .all(domain, parentCode)
    : db
        .prepare('SELECT * FROM master_data WHERE domain = ? AND active = 1 ORDER BY order_index')
        .all(domain);

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    parentCode: row.parent_code,
    ...(parseJson(row.extra_json, {}) ?? {}),
  }));
}

export function listDomains() {
  return getDb()
    .prepare('SELECT DISTINCT domain FROM master_data ORDER BY domain')
    .all()
    .map((row) => row.domain);
}

export function upsertMaster(domain, entries) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO master_data (domain, code, name, parent_code, extra_json, order_index, active)
     VALUES (@domain, @code, @name, @parentCode, @extra, @order, 1)
     ON CONFLICT (domain, code) DO UPDATE SET
       name = excluded.name, parent_code = excluded.parent_code,
       extra_json = excluded.extra_json, order_index = excluded.order_index, active = 1`,
  );

  const run = db.transaction((items) => {
    items.forEach((item, index) => {
      const { code, name, parentCode, ...extra } = item;
      insert.run({
        domain,
        code: String(code),
        name: String(name ?? code),
        parentCode: parentCode ?? null,
        extra: JSON.stringify(extra ?? {}),
        order: index,
      });
    });
  });

  run(entries);
  return entries.length;
}

export const isActive = (row) => toBool(row?.active);
