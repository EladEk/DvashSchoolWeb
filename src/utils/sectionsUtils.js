/**
 * Shared helpers for main-page sections: always use indices 0, 1, 2 (same for he/en).
 * Handles both array and object storage (including string keys like "about"/"authorities").
 */

export function ensureSectionsArray(v) {
  if (!v) return []
  if (Array.isArray(v)) {
    return [...v].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort((a, b) => {
      const posA = v[a]?.position ?? 999
      const posB = v[b]?.position ?? 999
      return posA - posB
    })
    return keys.map((k) => v[k])
  }
  return []
}

/**
 * Get sections as arrays in same order (by position from he). For mutate-then-save.
 * @param {object} translations - { he, en }
 * @param {string} sectionKey - e.g. 'sections' or 'parentsAssociationSections'
 */
export function getSectionsArraysFor(translations, sectionKey) {
  const heRaw = translations.he?.[sectionKey]
  const enRaw = translations.en?.[sectionKey]
  if (Array.isArray(heRaw)) {
    const indices = heRaw.map((_, i) => i).sort((a, b) => (heRaw[a]?.position ?? 999) - (heRaw[b]?.position ?? 999))
    const enArr = Array.isArray(enRaw) ? enRaw : []
    const sectionsHe = indices.map((i) => ({ ...heRaw[i] }))
    const sectionsEn = indices.map((i) => ({ ...(enArr[i] || {}) }))
    return { sectionsHe, sectionsEn }
  }
  if (heRaw && typeof heRaw === 'object') {
    const keys = Object.keys(heRaw).sort((a, b) => {
      const posA = heRaw[a]?.position ?? 999
      const posB = heRaw[b]?.position ?? 999
      return posA - posB
    })
    const sectionsHe = keys.map((k) => ({ ...heRaw[k] }))
    const sectionsEn = keys.map((k) => ({ ...(enRaw?.[k] || {}) }))
    return { sectionsHe, sectionsEn }
  }
  return { sectionsHe: [], sectionsEn: [] }
}

/** Main page sections (backward compatible). */
export function getSectionsArrays(translations) {
  return getSectionsArraysFor(translations, 'sections')
}
