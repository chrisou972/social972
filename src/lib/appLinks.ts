import type { DirectoryRecord } from '../types'

export const SITE_URL = 'https://chrisou972.github.io/social972/'
export const REPO_URL = 'https://github.com/chrisou972/social972'
export const DEFAULT_TITLE = 'Social972 | Annuaire social Martinique'
export const DEFAULT_DESCRIPTION =
  'Annuaire social de Martinique avec recherche, favoris, géolocalisation et accès rapide aux structures pour tous les publics.'

export const NEW_STRUCTURE_ISSUE_URL = `${REPO_URL}/issues/new?template=proposer-structure.yml`

export function buildCorrectionIssueUrl(record: DirectoryRecord | null) {
  const params = new URLSearchParams({
    template: 'signaler-correction.yml',
  })

  if (record) {
    params.set('title', `[Annuaire] Correction - ${record.name}`)
  }

  return `${REPO_URL}/issues/new?${params.toString()}`
}
