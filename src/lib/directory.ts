import type { DirectoryRecord } from '../types'

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function recordMatches(record: DirectoryRecord, query: string) {
  if (!query) {
    return true
  }

  const haystack = normalizeText(
    [
      record.name,
      record.serviceType,
      record.categoryLabel,
      record.summary,
      record.description,
      record.address,
      record.town,
      record.postalCode,
      ...record.audiences,
      ...record.tags,
      ...record.phoneNumbers,
      ...record.emails,
    ].join(' '),
  )

  return haystack.includes(normalizeText(query))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function buildDirectionsLinks(record: DirectoryRecord) {
  const coordinateQuery = record.coordinates
    ? `${record.coordinates.latitude},${record.coordinates.longitude}`
    : encodeURIComponent(record.address)

  return {
    google: `https://www.google.com/maps/search/?api=1&query=${coordinateQuery}`,
    osm: record.coordinates
      ? `https://www.openstreetmap.org/?mlat=${record.coordinates.latitude}&mlon=${record.coordinates.longitude}#map=17/${record.coordinates.latitude}/${record.coordinates.longitude}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(record.address)}`,
    apple: `https://maps.apple.com/?q=${coordinateQuery}`,
  }
}

export function toSentenceCount(current: number, total: number) {
  return `${current.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')}`
}
