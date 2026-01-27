/**
 * Website cache – one system, split by public (publish) vs edit mode.
 * Use so exiting/entering edit mode hits cache instead of DB/Git too often.
 *
 * - public: publish mode (Git + Parliament from Firebase).
 * - edit: edit mode (Firebase).
 */

const PREFIX = 'website_'

const memory = new Map() // fullKey -> { value, expiry }

function fullKey(key, mode) {
  return `${PREFIX}${mode}_${key}`
}

function getFromMemory(key, mode) {
  const ent = memory.get(fullKey(key, mode))
  if (!ent) return null
  if (ent.expiry != null && Date.now() > ent.expiry) {
    memory.delete(fullKey(key, mode))
    try {
      localStorage.removeItem(fullKey(key, mode))
    } catch (e) {}
    return null
  }
  return ent.value
}

function getFromStorage(key, mode) {
  try {
    const raw = localStorage.getItem(fullKey(key, mode))
    if (!raw) return null
    const { value, expiry } = JSON.parse(raw)
    if (expiry != null && Date.now() > expiry) {
      memory.delete(fullKey(key, mode))
      localStorage.removeItem(fullKey(key, mode))
      return null
    }
    return value
  } catch (e) {
    return null
  }
}

/**
 * Get cached value for a mode. Returns null if missing or expired.
 * @param {string} key - Cache key (e.g. 'texts', 'image_hero.image')
 * @param {'public'|'edit'} mode - public = publish mode, edit = edit mode
 * @returns {*} Cached value or null
 */
export function get(key, mode) {
  const fromMem = getFromMemory(key, mode)
  if (fromMem !== null) return fromMem
  const fromSt = getFromStorage(key, mode)
  if (fromSt !== null) {
    memory.set(fullKey(key, mode), { value: fromSt, expiry: null })
    return fromSt
  }
  return null
}

/**
 * Set cached value for a mode.
 * @param {string} key - Cache key
 * @param {*} value - Value to store (must be JSON-serializable for persist)
 * @param {'public'|'edit'} mode - public | edit
 * @param {number} [ttlMs] - TTL in ms; optional
 */
export function set(key, value, mode, ttlMs = 0) {
  const expiry = ttlMs ? Date.now() + ttlMs : null
  const fk = fullKey(key, mode)
  memory.set(fk, { value, expiry })
  try {
    localStorage.setItem(fk, JSON.stringify({ value, expiry }))
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      clearMode(mode)
    }
  }
}

/**
 * Remove one key for a mode.
 * @param {string} key - Cache key
 * @param {'public'|'edit'} mode - public | edit
 */
export function clearKey(key, mode) {
  const fk = fullKey(key, mode)
  memory.delete(fk)
  try {
    localStorage.removeItem(fk)
  } catch (e) {}
}

/**
 * Clear all entries for a mode.
 * @param {'public'|'edit'} mode - public | edit
 */
export function clearMode(mode) {
  const toRemove = []
  for (const k of memory.keys()) {
    if (k.startsWith(`${PREFIX}${mode}_`)) toRemove.push(k)
  }
  toRemove.forEach(k => memory.delete(k))
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(`${PREFIX}${mode}_`)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
}

/**
 * Clear keys for a mode that start with a prefix (e.g. 'image_').
 * @param {string} prefix - Key prefix
 * @param {'public'|'edit'} mode - public | edit
 */
export function clearKeysByPrefix(prefix, mode) {
  const toRemove = []
  const fullPrefix = `${PREFIX}${mode}_${prefix}`
  for (const k of memory.keys()) {
    if (k.startsWith(fullPrefix)) toRemove.push(k)
  }
  toRemove.forEach(k => memory.delete(k))
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(fullPrefix)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
}

/**
 * Clear all website caches (both modes).
 */
export function clearAll() {
  const toRemove = []
  for (const k of memory.keys()) {
    if (k.startsWith(PREFIX)) toRemove.push(k)
  }
  toRemove.forEach(k => memory.delete(k))
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
}

export default {
  get,
  set,
  clearKey,
  clearMode,
  clearKeysByPrefix,
  clearAll
}
