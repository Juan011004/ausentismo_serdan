export function normalizeText(value: unknown) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeHeader(value: unknown) {
  return normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

export function normalizeId(value: unknown) {
  const raw = normalizeText(value)
  return raw.endsWith('.0') && /^\d+\.0$/.test(raw) ? raw.slice(0, -2) : raw
}

export function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + Math.trunc(value) * 86_400_000).toISOString().slice(0, 10)
  }
  const raw = normalizeText(value)
  if (!raw || raw === '-') return raw
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  const latin = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (latin) return `${latin[3]}-${latin[2].padStart(2, '0')}-${latin[1].padStart(2, '0')}`
  if (/^\d{5}(?:\.\d+)?$/.test(raw)) return isoDate(Number(raw))
  return raw
}

export function operationalDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
