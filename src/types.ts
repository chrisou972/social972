export type Coordinates = {
  latitude: number
  longitude: number
}

export type DirectoryRecord = {
  id: string
  name: string
  serviceType: string
  categoryId: string
  categoryLabel: string
  summary: string
  description: string
  town: string
  postalCode: string
  address: string
  phoneNumbers: string[]
  emails: string[]
  website: string | null
  coordinates: Coordinates | null
  audiences: string[]
  tags: string[]
  hours: string[]
  sourceName: string
  sourceUrl: string
  sourceCategoryUrl: string
  lastVerifiedAt: string
}

export type DirectoryMetadata = {
  generatedAt: string
  totalRecords: number
  totalCategories: number
  totalCommunes: number
  totalPhones: number
  totalEmails: number
  coverage: {
    coordinates: number
    phones: number
    emails: number
  }
  categories: Array<{
    id: string
    label: string
    count: number
    url: string
  }>
  audiences: Array<{
    label: string
    count: number
  }>
  failures: Array<{
    categoryId: string
    categoryLabel: string
    message: string
  }>
}
