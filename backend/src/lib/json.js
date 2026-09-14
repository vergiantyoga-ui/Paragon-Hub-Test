/** Parsing JSON yang tidak pernah melempar; kolom rusak dianggap kosong. */
export function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const toJson = (value) => (value === undefined ? null : JSON.stringify(value ?? null));

/** SQLite tidak punya boolean; 0/1 dipakai dan dikembalikan sebagai boolean. */
export const toInt = (value) => (value ? 1 : 0);
export const toBool = (value) => value === 1 || value === true;
