import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'src', 'data')
const reportsDir = path.join(projectRoot, 'reports')
const recordsPath = path.join(dataDir, 'structures.generated.json')
const metadataPath = path.join(dataDir, 'metadata.generated.json')
const reportJsonPath = path.join(reportsDir, 'directory-health.json')
const reportMarkdownPath = path.join(reportsDir, 'directory-health.md')
const manualRecordsSourcePath = path.join(__dirname, 'manual-structures.json')
const geocodeCachePath = path.join(__dirname, 'geocode-cache.json')

const isCheckOnly = process.argv.includes('--check')

const fetchHeaders = {
  'accept-language': 'fr-FR,fr;q=0.9',
  'user-agent': 'Social972 data sync bot/1.1 (+https://github.com/chrisou972/social972)',
}

const geocodeHeaders = {
  ...fetchHeaders,
  'user-agent': 'Social972 geocoder/1.1 (+https://github.com/chrisou972/social972)',
}

const schemaDayMap = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
}

const categoryDefinitions = [
  {
    id: 'aide_alimentaire',
    label: 'Aide alimentaire',
    url: 'https://martinique.deets.gouv.fr/sites/martinique.deets.gouv.fr/IMG/pdf/liste_associations_habilitees_a_l_aide_alimentaire_2022_2_.pdf',
    audiences: ['Tout public', 'Familles', 'Urgence sociale'],
    tags: ['Aide alimentaire', 'Epicerie solidaire', 'Colis'],
    summary:
      "Associations habilitees et lieux solidaires pour l'aide alimentaire, les colis, repas et epiceries sociales.",
  },
  {
    id: 'logement',
    label: 'Logement / hebergement',
    url: 'https://www.actionlogement.fr/fort-de-france',
    audiences: ['Adultes', 'Familles', 'Urgence sociale'],
    tags: ['Logement', 'Hebergement', 'Insertion'],
    summary:
      "Structures utiles pour l'hebergement, l'acces au logement, l'accompagnement social et les parcours residentiels.",
  },
  {
    id: 'ctm',
    label: 'Dispositifs CTM',
    url: 'https://www.collectivitedemartinique.mq/aides-et-demarches/',
    audiences: ['Tout public', 'Seniors', 'Handicap'],
    tags: ['CTM', 'Aides', 'Orientation'],
    summary:
      "Guichets et dispositifs de la Collectivite Territoriale de Martinique pour l'autonomie, l'accueil et l'accompagnement social.",
  },
  {
    id: 'croix_rouge',
    label: 'Croix-Rouge Martinique',
    url: 'https://www.croix-rouge.fr/delegation-territoriale-de-la-martinique',
    audiences: ['Tout public', 'Familles', 'Urgence sociale'],
    tags: ['Croix-Rouge', 'Solidarite', 'Accompagnement'],
    summary:
      "Services et etablissements de la Croix-Rouge en Martinique pour l'urgence sociale, la sante, l'insertion et l'accompagnement.",
  },
  {
    id: 'ccas',
    label: 'CCAS / CIAS',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/ccas',
    audiences: ['Tout public', 'Adultes', 'Familles'],
    tags: ['Aides sociales', 'Proximite', 'Accompagnement'],
    summary:
      "Structures communales d'accompagnement social pour les aides locales, les demarches et l'orientation.",
  },
  {
    id: 'france_services',
    label: 'France services',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/france_services',
    audiences: ['Tout public', 'Adultes', 'Seniors'],
    tags: ['Demarches', 'Administratif', 'Proximite'],
    summary:
      "Guichets de proximite pour les demarches administratives et l'accompagnement numerique.",
  },
  {
    id: 'point_justice',
    label: 'Point-justice',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/point_justice',
    audiences: ['Tout public', 'Femmes', 'Victimes'],
    tags: ['Justice', 'Droits', 'Information'],
    summary:
      "Lieux d'information juridique, d'acces au droit et d'orientation vers les acteurs competents.",
  },
  {
    id: 'mission_locale',
    label: 'Mission locale',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/mission_locale',
    audiences: ['Jeunes', 'Insertion', 'Emploi'],
    tags: ['Jeunes', 'Insertion', 'Orientation'],
    summary:
      "Accompagnement des 16-25 ans pour l'emploi, la formation, la mobilite et l'insertion sociale.",
  },
  {
    id: 'france_travail',
    label: 'France Travail',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/france_travail',
    audiences: ['Adultes', 'Emploi', 'Reconversion'],
    tags: ['Emploi', 'Orientation', 'Insertion'],
    summary:
      "Agences d'accompagnement a l'emploi, a la formation et au suivi des demandeurs d'emploi.",
  },
  {
    id: 'cpam',
    label: 'CPAM',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/cpam',
    audiences: ['Tout public', 'Sante', 'Adultes'],
    tags: ['Sante', 'Couverture', 'Assurance maladie'],
    summary:
      "Points d'accueil pour les demarches de couverture sante, remboursements et droits maladie.",
  },
  {
    id: 'caf',
    label: 'CAF',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/caf',
    audiences: ['Familles', 'Parents', 'Adultes'],
    tags: ['Famille', 'Allocations', 'Parentalite'],
    summary:
      "Organisme de reference pour les prestations familiales, aides au logement et soutien a la parentalite.",
  },
  {
    id: 'pmi',
    label: 'PMI',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/pmi',
    audiences: ['Enfants', 'Parents', 'Grossesse'],
    tags: ['Petite enfance', 'Sante', 'Maternalite'],
    summary:
      "Centres de protection maternelle et infantile pour le suivi de la grossesse et de la petite enfance.",
  },
  {
    id: 'pif',
    label: 'Point info famille',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/pif',
    audiences: ['Familles', 'Parents', 'Adolescents'],
    tags: ['Famille', 'Parentalite', 'Orientation'],
    summary:
      "Points d'accueil et d'information pour orienter les familles vers les dispositifs existants.",
  },
  {
    id: 'mdph',
    label: 'MDPH',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/maison_handicapees',
    audiences: ['Handicap', 'Aidants', 'Familles'],
    tags: ['Handicap', 'Droits', 'Compensation'],
    summary:
      "Maison departementale pour les droits, aides et demarches des personnes en situation de handicap.",
  },
  {
    id: 'cap_emploi',
    label: 'Cap emploi',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/cap_emploi',
    audiences: ['Handicap', 'Emploi', 'Adultes'],
    tags: ['Handicap', 'Insertion', 'Emploi'],
    summary:
      "Accompagnement specialise vers l'emploi pour les personnes en situation de handicap.",
  },
  {
    id: 'drdfe',
    label: 'Droits des femmes',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/dr_femmes',
    audiences: ['Femmes', 'Egalite', 'Victimes'],
    tags: ['Femmes', 'Egalite', 'Orientation'],
    summary:
      "Service regional d'orientation pour l'egalite femmes-hommes et l'acces aux droits.",
  },
  {
    id: 'aav',
    label: "Aide aux victimes",
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/aav',
    audiences: ['Victimes', 'Femmes', 'Tout public'],
    tags: ['Ecoute', 'Protection', 'Accompagnement'],
    summary:
      "Associations d'ecoute, de protection et d'accompagnement des victimes.",
  },
  {
    id: 'clic',
    label: 'Information seniors',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/clic',
    audiences: ['Seniors', 'Aidants', 'Familles'],
    tags: ['Seniors', 'Autonomie', 'Information'],
    summary:
      "Points d'information locale pour les personnes agees, la perte d'autonomie et les aidants.",
  },
  {
    id: 'aidants',
    label: 'Aidants personnes agees',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/accompagnement_personnes_agees',
    audiences: ['Aidants', 'Seniors', 'Familles'],
    tags: ['Aidants', 'Repit', 'Autonomie'],
    summary:
      "Plateformes de soutien, d'ecoute et de repit pour les aidants de personnes agees.",
  },
  {
    id: 'ars',
    label: 'ARS',
    url: 'https://lannuaire.service-public.gouv.fr/navigation/martinique/martinique/ars',
    audiences: ['Tout public', 'Sante', 'Handicap'],
    tags: ['Sante', 'Orientation', 'Prevention'],
    summary:
      "Agence regionale de sante pour l'organisation territoriale des dispositifs de sante et de prevention.",
  },
]

const categoryIndex = new Map(categoryDefinitions.map((category) => [category.id, category]))

const townAliases = {
  'ajoupa bouillon': "L'Ajoupa-Bouillon",
  'l ajoupa bouillon': "L'Ajoupa-Bouillon",
  "l'ajoupa bouillon": "L'Ajoupa-Bouillon",
  'anses d arlet': "Les Anses-d'Arlet",
  'les anses d arlet': "Les Anses-d'Arlet",
  'basse pointe': 'Basse-Pointe',
  bellefontaine: 'Bellefontaine',
  'case pilote': 'Case-Pilote',
  ducos: 'Ducos',
  'fonds saint denis': 'Fonds-Saint-Denis',
  'fort de france': 'Fort-de-France',
  'grand riviere': "Grand'Riviere",
  'gros morne': 'Gros-Morne',
  'la trinite': 'La Trinite',
  'le carbet': 'Le Carbet',
  'le diamant': 'Le Diamant',
  'le francois': 'Le Francois',
  'le lamentin': 'Le Lamentin',
  'le lorrain': 'Le Lorrain',
  'le marigot': 'Le Marigot',
  'le marin': 'Le Marin',
  'le morne rouge': 'Le Morne-Rouge',
  'le morne vert': 'Le Morne-Vert',
  'le precheur': 'Le Precheur',
  'le robert': 'Le Robert',
  'le vauclin': 'Le Vauclin',
  macouba: 'Macouba',
  'riviere pilote': 'Riviere-Pilote',
  'riviere salee': 'Riviere-Salee',
  'saint esprit': 'Saint-Esprit',
  'saint joseph': 'Saint-Joseph',
  'saint pierre': 'Saint-Pierre',
  'sainte anne': 'Sainte-Anne',
  'sainte luce': 'Sainte-Luce',
  'sainte marie': 'Sainte-Marie',
  schoelcher: 'Schoelcher',
  trinite: 'La Trinite',
  'trois ilets': 'Les Trois-Ilets',
  'les trois ilets': 'Les Trois-Ilets',
}

function compactText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLookupKey(value) {
  return compactText(value)
    .replace(/[Œœ]/g, 'oe')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+cedex(?:\s+\d+)?$/i, '')
    .toLowerCase()
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))]
}

function safeNumber(value) {
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function normaliseList(value) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function loadJsonFile(filePath, fallbackValue) {
  try {
    const fileContents = await fs.readFile(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallbackValue
    }

    throw error
  }
}

function formatAddress(address) {
  if (!address) {
    return ''
  }

  if (typeof address === 'string') {
    return compactText(address)
  }

  const street = compactText(address.streetAddress ?? address.name ?? '')
  const locality = compactText(address.addressLocality ?? '')
  const postalCode = compactText(address.postalCode ?? '')
  const country = compactText(address.addressCountry ?? '')

  return compactText([street, [postalCode, locality].filter(Boolean).join(' '), country].filter(Boolean).join(', '))
}

function normalizeTown(value) {
  const rawValue = compactText(value).replace(/\s+cedex(?:\s+\d+)?$/i, '')
  const key = normalizeLookupKey(rawValue)

  return townAliases[key] ?? rawValue
}

function extractContacts(contactPoint) {
  const points = normaliseList(contactPoint)
  const phoneNumbers = uniq(
    points.map((item) => compactText(item.telephone ?? item?.contactPoint?.telephone ?? '')),
  )
  const emails = uniq(points.map((item) => compactText(item.email ?? item?.contactPoint?.email ?? '')))

  return { phoneNumbers, emails }
}

function extractHours(openingHoursSpecification) {
  const slotsByDay = new Map()

  for (const slot of normaliseList(openingHoursSpecification)) {
    const rawDay = compactText(slot.dayOfWeek).split('/').pop()
    const day = schemaDayMap[rawDay] ?? compactText(rawDay)
    const opens = compactText(slot.opens)
    const closes = compactText(slot.closes)
    const label = compactText([opens, closes].filter(Boolean).join(' - '))

    if (!day || !label) {
      continue
    }

    const existing = slotsByDay.get(day) ?? []
    existing.push(label)
    slotsByDay.set(day, existing)
  }

  return [...slotsByDay.entries()].map(([day, slots]) => `${day}: ${slots.join(' / ')}`)
}

function categoryRecordCount(records, categoryId) {
  return records.filter((record) => record.categoryId === categoryId).length
}

function audienceCount(records, audience) {
  return records.filter((record) => record.audiences.includes(audience)).length
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: fetchHeaders })

  if (!response.ok) {
    throw new Error(`Echec ${response.status} pour ${url}`)
  }

  return response.text()
}

async function fetchUrlAvailable(url) {
  const response = await fetch(url, {
    headers: fetchHeaders,
    method: 'GET',
    redirect: 'follow',
  })

  return response.ok
}

function extractTotalPages(html) {
  const $ = cheerio.load(html)
  const rawValue = $('#btn-add-next20').attr('data-total-pages')

  if (!rawValue) {
    return 1
  }

  const parsed = Number.parseInt(rawValue, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function extractDetailUrls(html) {
  const $ = cheerio.load(html)

  return uniq(
    $('[data-test="href-link-annuaire"]')
      .map((_, element) => {
        const href = $(element).attr('href')

        if (!href) {
          return null
        }

        return new URL(href, 'https://lannuaire.service-public.gouv.fr').toString()
      })
      .get(),
  )
}

async function asyncPool(limit, items, worker) {
  const results = []
  const executing = new Set()

  for (const item of items) {
    const promise = Promise.resolve().then(() => worker(item))
    results.push(promise)
    executing.add(promise)

    const clean = () => executing.delete(promise)
    promise.then(clean).catch(clean)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

async function collectCategoryLinks(category) {
  const firstPageHtml = await fetchHtml(category.url)
  const totalPages = extractTotalPages(firstPageHtml)
  const urls = new Set(extractDetailUrls(firstPageHtml))

  for (let page = 2; page <= totalPages; page += 1) {
    const pageHtml = await fetchHtml(`${category.url}?page=${page}`)

    for (const url of extractDetailUrls(pageHtml)) {
      urls.add(url)
    }
  }

  return [...urls]
}

async function collectRecord(detailUrl, category) {
  const html = await fetchHtml(detailUrl)
  const $ = cheerio.load(html)
  const rawLdJson = $('script[data-test="micro-datas-ld-json"]').html()

  if (!rawLdJson) {
    throw new Error(`Microdonnees manquantes sur ${detailUrl}`)
  }

  const parsed = JSON.parse(rawLdJson)
  const entity = Array.isArray(parsed) ? parsed[0] : parsed
  const address = entity.location?.address ?? entity.address ?? {}
  const coordinates = entity.location?.geo ?? entity.geo ?? {}
  const latitude = safeNumber(coordinates.latitude)
  const longitude = safeNumber(coordinates.longitude)
  const { phoneNumbers, emails } = extractContacts(entity.contactPoint)
  const website =
    $('a[href^="http"][data-test="site-internet"]').attr('href') ||
    $('a[data-test="site-internet"]').attr('href') ||
    compactText(entity.url ?? '')

  return {
    id: detailUrl.split('/').pop(),
    name: compactText(entity.name),
    serviceType: compactText(entity.serviceType || category.label),
    categoryId: category.id,
    categoryLabel: category.label,
    summary: category.summary,
    description: compactText(entity.description),
    town: normalizeTown(address.addressLocality),
    postalCode: compactText(address.postalCode),
    address: formatAddress(address),
    phoneNumbers,
    emails,
    website: website || null,
    coordinates:
      latitude !== null && longitude !== null
        ? {
            latitude,
            longitude,
          }
        : null,
    audiences: category.audiences,
    tags: category.tags,
    hours: extractHours(entity.openingHoursSpecification),
    sourceName: 'Annuaire Service-Public',
    sourceUrl: detailUrl,
    sourceCategoryUrl: category.url,
    lastVerifiedAt: new Date().toISOString(),
  }
}

function mergeRecords(records) {
  const merged = new Map()

  for (const record of records) {
    const existing = merged.get(record.id)

    if (!existing) {
      merged.set(record.id, record)
      continue
    }

    merged.set(record.id, {
      ...existing,
      audiences: uniq([...existing.audiences, ...record.audiences]),
      tags: uniq([...existing.tags, ...record.tags]),
      phoneNumbers: uniq([...existing.phoneNumbers, ...record.phoneNumbers]),
      emails: uniq([...existing.emails, ...record.emails]),
      hours: uniq([...existing.hours, ...record.hours]),
      website: existing.website ?? record.website,
      description: existing.description || record.description,
      summary: existing.summary || record.summary,
    })
  }

  return [...merged.values()].sort((left, right) => {
    const townCompare = left.town.localeCompare(right.town, 'fr')

    if (townCompare !== 0) {
      return townCompare
    }

    return left.name.localeCompare(right.name, 'fr')
  })
}

async function loadManualSourceRecords() {
  const records = await loadJsonFile(manualRecordsSourcePath, [])

  if (!Array.isArray(records)) {
    throw new Error('Le fichier manual-structures.json doit contenir un tableau JSON.')
  }

  return records
}

async function loadGeocodeCache() {
  const rawCache = await loadJsonFile(geocodeCachePath, {})

  if (!rawCache || typeof rawCache !== 'object' || Array.isArray(rawCache)) {
    throw new Error('Le fichier geocode-cache.json doit contenir un objet JSON.')
  }

  return rawCache
}

async function saveGeocodeCache(cache) {
  if (isCheckOnly) {
    return
  }

  await fs.writeFile(geocodeCachePath, `${JSON.stringify(cache, null, 2)}\n`)
}

function normalizeGeocodeKey(value) {
  return normalizeLookupKey(value)
}

async function geocodeAddress(address, geocodeCache) {
  const normalizedAddress = compactText(address)

  if (!normalizedAddress) {
    return null
  }

  const cacheKey = normalizeGeocodeKey(normalizedAddress)
  const cached = geocodeCache[cacheKey]

  if (cached && safeNumber(cached.latitude) !== null && safeNumber(cached.longitude) !== null) {
    return {
      latitude: Number(cached.latitude),
      longitude: Number(cached.longitude),
    }
  }

  const query = normalizedAddress.toLowerCase().includes('martinique')
    ? normalizedAddress
    : `${normalizedAddress}, Martinique, France`
  const geocodeUrl = new URL('https://nominatim.openstreetmap.org/search')

  geocodeUrl.searchParams.set('format', 'jsonv2')
  geocodeUrl.searchParams.set('limit', '1')
  geocodeUrl.searchParams.set('countrycodes', 'fr')
  geocodeUrl.searchParams.set('q', query)

  await sleep(1100)

  try {
    const response = await fetch(geocodeUrl, { headers: geocodeHeaders })

    if (!response.ok) {
      return null
    }

    const matches = await response.json()
    const firstMatch = Array.isArray(matches) ? matches[0] : null
    const latitude = safeNumber(firstMatch?.lat)
    const longitude = safeNumber(firstMatch?.lon)

    if (latitude === null || longitude === null) {
      return null
    }

    const coordinates = { latitude, longitude }
    geocodeCache[cacheKey] = coordinates
    return coordinates
  } catch {
    return null
  }
}

function buildManualCoordinates(recordCoordinates) {
  if (!recordCoordinates || typeof recordCoordinates !== 'object') {
    return null
  }

  const latitude = safeNumber(recordCoordinates.latitude)
  const longitude = safeNumber(recordCoordinates.longitude)

  if (latitude === null || longitude === null) {
    return null
  }

  return { latitude, longitude }
}

async function hydrateManualRecord(rawRecord, geocodeCache, generatedAt) {
  const category = categoryIndex.get(rawRecord.categoryId)

  if (!category) {
    throw new Error(`Categorie manuelle inconnue: ${rawRecord.categoryId}`)
  }

  const coordinates =
    buildManualCoordinates(rawRecord.coordinates) ??
    (await geocodeAddress(rawRecord.address ?? '', geocodeCache))

  return {
    id: compactText(rawRecord.id),
    name: compactText(rawRecord.name),
    serviceType: compactText(rawRecord.serviceType || category.label),
    categoryId: category.id,
    categoryLabel: category.label,
    summary: compactText(rawRecord.summary || category.summary),
    description: compactText(rawRecord.description || category.summary),
    town: normalizeTown(rawRecord.town),
    postalCode: compactText(rawRecord.postalCode),
    address: compactText(rawRecord.address),
    phoneNumbers: uniq(normaliseList(rawRecord.phoneNumbers).map((phone) => compactText(phone))),
    emails: uniq(normaliseList(rawRecord.emails).map((email) => compactText(email))),
    website: compactText(rawRecord.website) || null,
    coordinates,
    audiences: uniq(
      normaliseList(rawRecord.audiences)
        .map((audience) => compactText(audience))
        .filter(Boolean)
        .concat(category.audiences),
    ),
    tags: uniq(
      normaliseList(rawRecord.tags)
        .map((tag) => compactText(tag))
        .filter(Boolean)
        .concat(category.tags),
    ),
    hours: uniq(normaliseList(rawRecord.hours).map((hour) => compactText(hour))),
    sourceName: compactText(rawRecord.sourceName || 'Source officielle'),
    sourceUrl: compactText(rawRecord.sourceUrl),
    sourceCategoryUrl: compactText(rawRecord.sourceCategoryUrl || category.url || rawRecord.sourceUrl),
    lastVerifiedAt: generatedAt,
  }
}

async function verifyManualSources(rawRecords, failures) {
  const sources = new Map()

  for (const record of rawRecords) {
    const sourceUrl = compactText(record.sourceUrl)

    if (!sourceUrl || sources.has(sourceUrl)) {
      continue
    }

    sources.set(sourceUrl, {
      label: compactText(record.name || 'Source manuelle'),
      categoryId: compactText(record.categoryId || 'manual'),
    })
  }

  await asyncPool(4, [...sources.entries()], async ([sourceUrl, sourceInfo]) => {
    const isAvailable = await fetchUrlAvailable(sourceUrl)

    if (!isAvailable) {
      const category = categoryIndex.get(sourceInfo.categoryId)

      failures.push({
        categoryId: sourceInfo.categoryId,
        categoryLabel: category?.label ?? 'Source manuelle',
        message: `Source indisponible pour ${sourceInfo.label}: ${sourceUrl}`,
      })
    }
  })
}

function buildReport(records, failures, generatedAt) {
  const audienceLabels = uniq(records.flatMap((record) => record.audiences)).sort((left, right) =>
    left.localeCompare(right, 'fr'),
  )

  const categoryCounts = categoryDefinitions.map((category) => ({
    id: category.id,
    label: category.label,
    count: categoryRecordCount(records, category.id),
    url: category.url,
  }))

  const audienceCounts = audienceLabels.map((label) => ({
    label,
    count: audienceCount(records, label),
  }))

  const coverage = {
    coordinates: records.filter((record) => record.coordinates).length,
    phones: records.filter((record) => record.phoneNumbers.length > 0).length,
    emails: records.filter((record) => record.emails.length > 0).length,
  }

  const report = {
    generatedAt,
    totalRecords: records.length,
    totalCategories: categoryDefinitions.length,
    totalCommunes: uniq(records.map((record) => record.town).filter(Boolean)).length,
    totalPhones: records.reduce((total, record) => total + record.phoneNumbers.length, 0),
    totalEmails: records.reduce((total, record) => total + record.emails.length, 0),
    categories: categoryCounts,
    audiences: audienceCounts,
    coverage,
    failures,
  }

  const markdown = [
    '# Rapport Social972',
    '',
    `- Genere le : ${generatedAt}`,
    `- Structures recensees : ${report.totalRecords}`,
    `- Communes couvertes : ${report.totalCommunes}`,
    `- Categories synchronisees : ${report.totalCategories}`,
    `- Fiches avec GPS : ${coverage.coordinates}/${report.totalRecords}`,
    `- Fiches avec telephone : ${coverage.phones}/${report.totalRecords}`,
    `- Fiches avec email : ${coverage.emails}/${report.totalRecords}`,
    '',
    '## Repartition par categorie',
    '',
    '| Categorie | Nombre |',
    '| --- | ---: |',
    ...categoryCounts.map((category) => `| ${category.label} | ${category.count} |`),
    '',
    '## Repartition par public',
    '',
    '| Public | Nombre |',
    '| --- | ---: |',
    ...audienceCounts.map((audience) => `| ${audience.label} | ${audience.count} |`),
  ]

  if (failures.length > 0) {
    markdown.push('', '## Echecs de synchronisation', '')
    markdown.push(...failures.map((failure) => `- ${failure.categoryLabel}: ${failure.message}`))
  }

  return { report, markdown: `${markdown.join('\n')}\n` }
}

async function main() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(reportsDir, { recursive: true })

  const collectedRecords = []
  const failures = []

  for (const category of categoryDefinitions.filter((entry) => entry.url.includes('service-public'))) {
    try {
      const detailUrls = await collectCategoryLinks(category)
      const records = await asyncPool(6, detailUrls, (detailUrl) => collectRecord(detailUrl, category))
      collectedRecords.push(...records)
      console.log(`OK ${category.label}: ${records.length} fiche(s)`)
    } catch (error) {
      failures.push({
        categoryId: category.id,
        categoryLabel: category.label,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      })
      console.error(`ERREUR ${category.label}:`, error)
    }
  }

  const generatedAt = new Date().toISOString()
  const rawManualRecords = await loadManualSourceRecords()
  const geocodeCache = await loadGeocodeCache()
  const geocodeCacheBefore = JSON.stringify(geocodeCache)

  await verifyManualSources(rawManualRecords, failures)

  for (const rawRecord of rawManualRecords) {
    try {
      const manualRecord = await hydrateManualRecord(rawRecord, geocodeCache, generatedAt)
      collectedRecords.push(manualRecord)
    } catch (error) {
      const category = categoryIndex.get(compactText(rawRecord.categoryId))

      failures.push({
        categoryId: compactText(rawRecord.categoryId || 'manual'),
        categoryLabel: category?.label ?? 'Source manuelle',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      })
      console.error('ERREUR fiche manuelle:', error)
    }
  }

  if (JSON.stringify(geocodeCache) !== geocodeCacheBefore) {
    await saveGeocodeCache(geocodeCache)
  }

  const records = mergeRecords(collectedRecords)
  const { report, markdown } = buildReport(records, failures, generatedAt)

  if (!isCheckOnly) {
    await fs.writeFile(recordsPath, `${JSON.stringify(records, null, 2)}\n`)
    await fs.writeFile(metadataPath, `${JSON.stringify(report, null, 2)}\n`)
  }

  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)
  await fs.writeFile(reportMarkdownPath, markdown)

  console.log(
    `Synchronisation terminee: ${report.totalRecords} structure(s), ${report.totalCommunes} commune(s), ${failures.length} erreur(s).`,
  )

  if (records.length === 0 || failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
