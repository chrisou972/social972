import type { CSSProperties } from 'react'
import {
  Download,
  ExternalLink,
  HeartHandshake,
  Mail,
  MapPinned,
  MoonStar,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Star,
  SunMedium,
} from 'lucide-react'
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import directoryMetadata from './data/metadata.generated.json'
import directoryRecords from './data/structures.generated.json'
import { categoryVisuals } from './data/categoryVisuals'
import { socialQuiz } from './data/socialQuiz'
import './App.css'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  buildCorrectionIssueUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  NEW_STRUCTURE_ISSUE_URL,
  REPO_URL,
  SITE_URL,
} from './lib/appLinks'
import { buildDirectionsLinks, formatDateTime, recordMatches } from './lib/directory'
import type { DirectoryMetadata, DirectoryRecord } from './types'

type ThemeMode = 'day' | 'night'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

const records = directoryRecords as DirectoryRecord[]
const metadata = directoryMetadata as DirectoryMetadata
const fallbackVisual = {
  icon: HeartHandshake,
  accent: '#38bdf8',
  softAccent: 'rgba(56, 189, 248, 0.16)',
}

function setMetaByName(name: string, content: string) {
  const element = document.querySelector(`meta[name="${name}"]`)
  if (element) {
    element.setAttribute('content', content)
  }
}

function setMetaByProperty(property: string, content: string) {
  const element = document.querySelector(`meta[property="${property}"]`)
  if (element) {
    element.setAttribute('content', content)
  }
}

function buildRecordDescription(record: DirectoryRecord) {
  const contact = record.phoneNumbers[0] ? ` Telephone: ${record.phoneNumbers[0]}.` : ''
  return `${record.name}. ${record.categoryLabel} en Martinique${record.town ? ` a ${record.town}` : ''}. ${record.summary}.${contact}`
}

function App() {
  const [theme, setTheme] = useLocalStorage<ThemeMode>('social972-theme', 'night')
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('social972-favorites', [])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedAudience, setSelectedAudience] = useState('all')
  const [selectedTown, setSelectedTown] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const urlId = new URLSearchParams(window.location.search).get('id')
    return urlId ?? records[0]?.id ?? null
  })
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [quizIndex, setQuizIndex] = useState(() => Math.floor(Math.random() * socialQuiz.length))
  const [gateFeedback, setGateFeedback] = useState<string | null>(null)
  const [gateUnlocked, setGateUnlocked] = useState(() => {
    return window.sessionStorage.getItem('social972-gate') === 'open'
  })

  const deferredQuery = useDeferredValue(query)
  const favoriteSet = new Set(favoriteIds)
  const towns = [...new Set(records.map((record) => record.town).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'fr'),
  )

  const filteredRecords = records
    .filter((record) => selectedCategory === 'all' || record.categoryId === selectedCategory)
    .filter((record) => selectedAudience === 'all' || record.audiences.includes(selectedAudience))
    .filter((record) => selectedTown === 'all' || record.town === selectedTown)
    .filter((record) => !favoritesOnly || favoriteSet.has(record.id))
    .filter((record) => recordMatches(record, deferredQuery))
    .sort((left, right) => {
      const favoriteDelta = Number(favoriteSet.has(right.id)) - Number(favoriteSet.has(left.id))

      if (favoriteDelta !== 0) {
        return favoriteDelta
      }

      return left.name.localeCompare(right.name, 'fr')
    })

  const activeRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    records.find((record) => record.id === selectedId) ??
    records[0] ??
    null
  const activeQuiz = socialQuiz[quizIndex]
  const activeVisual = activeRecord ? categoryVisuals[activeRecord.categoryId] ?? fallbackVisual : fallbackVisual
  const directions = activeRecord ? buildDirectionsLinks(activeRecord) : null
  const visibleFavorites = filteredRecords.filter((record) => favoriteSet.has(record.id)).length

  const applyTheme = useEffectEvent((nextTheme: ThemeMode) => {
    document.documentElement.dataset.theme = nextTheme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', nextTheme === 'night' ? '#081427' : '#f3ede3')
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const onPopState = () => {
      const urlId = new URLSearchParams(window.location.search).get('id')
      setSelectedId(urlId ?? records[0]?.id ?? null)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)

    if (activeRecord?.id) {
      url.searchParams.set('id', activeRecord.id)
    } else {
      url.searchParams.delete('id')
    }

    window.history.replaceState({}, '', url)
  }, [activeRecord])

  const syncSeo = useEffectEvent((record: DirectoryRecord | null) => {
    const title = record ? `${record.name} | Social972` : DEFAULT_TITLE
    const description = record ? buildRecordDescription(record) : DEFAULT_DESCRIPTION
    const pageUrl = record ? `${SITE_URL}?id=${record.id}` : SITE_URL

    document.title = title
    setMetaByName('description', description)
    setMetaByName('twitter:title', title)
    setMetaByName('twitter:description', description)
    setMetaByProperty('og:title', title)
    setMetaByProperty('og:description', description)
    setMetaByProperty('og:url', pageUrl)
  })

  useEffect(() => {
    syncSeo(activeRecord)
  }, [activeRecord])

  function toggleFavorite(recordId: string) {
    setFavoriteIds((currentFavorites) => {
      if (currentFavorites.includes(recordId)) {
        return currentFavorites.filter((favoriteId) => favoriteId !== recordId)
      }

      return [...currentFavorites, recordId]
    })
  }

  function setCategory(categoryId: string) {
    startTransition(() => {
      setSelectedCategory(categoryId)
    })
  }

  function setAudience(audience: string) {
    startTransition(() => {
      setSelectedAudience(audience)
    })
  }

  function resetFilters() {
    startTransition(() => {
      setQuery('')
      setSelectedCategory('all')
      setSelectedAudience('all')
      setSelectedTown('all')
      setFavoritesOnly(false)
    })
  }

  function checkGate(answer: string) {
    if (answer === activeQuiz.answer) {
      window.sessionStorage.setItem('social972-gate', 'open')
      setGateFeedback(null)
      setGateUnlocked(true)
      return
    }

    setGateFeedback('Ce portail s ouvre avec une reponse liee a la solidarite. Reessaie.')
    setQuizIndex((current) => (current + 1) % socialQuiz.length)
  }

  async function installApp() {
    if (!installPrompt) {
      return
    }

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          </div>
          <div>
            <p className="eyebrow">Guide social Martinique</p>
            <h1>Social972</h1>
            <p className="brand-copy">
              Un annuaire PWA pense pour trouver rapidement les structures sociales, les contacter,
              garder ses favoris et partir vers elles avec le GPS.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <span className="meta-pill">
            <ShieldCheck size={16} />
            Source officielle
          </span>
          <span className="meta-pill">
            <RefreshCcw size={16} />
            Maj hebdo
          </span>
          {installPrompt ? (
            <button className="ghost-button" type="button" onClick={installApp}>
              <Download size={16} />
              Installer
            </button>
          ) : null}
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
          >
            {theme === 'night' ? <SunMedium size={16} /> : <MoonStar size={16} />}
            {theme === 'night' ? 'Mode jour' : 'Mode nuit'}
          </button>
        </div>
      </header>

      <main className={`workspace ${gateUnlocked ? '' : 'workspace--locked'}`}>
        <aside className="sidebar">
          <section className="hero-card">
            <p className="eyebrow">Carte d entree</p>
            <h2>{metadata.totalRecords} structures utiles</h2>
            <p>
              {metadata.totalCommunes} communes couvertes, avec fiches officielles, favoris locaux
              et acces hors ligne partiel.
            </p>

            <div className="stat-grid">
              <article className="stat-card">
                <strong>{metadata.coverage.coordinates}</strong>
                <span>GPS disponibles</span>
              </article>
              <article className="stat-card">
                <strong>{metadata.coverage.emails}</strong>
                <span>Emails trouves</span>
              </article>
              <article className="stat-card">
                <strong>{favoriteIds.length}</strong>
                <span>Favoris locaux</span>
              </article>
              <article className="stat-card">
                <strong>{metadata.totalCategories}</strong>
                <span>Familles de structures</span>
              </article>
            </div>
          </section>

          <section className="filter-card">
            <div className="section-heading">
              <span>Publics</span>
              <small>{metadata.audiences.length}</small>
            </div>
            <div className="chip-grid">
              <button
                type="button"
                className={`chip ${selectedAudience === 'all' ? 'is-active' : ''}`}
                onClick={() => setAudience('all')}
              >
                Tous
              </button>
              {metadata.audiences.map((audience) => (
                <button
                  key={audience.label}
                  type="button"
                  className={`chip ${selectedAudience === audience.label ? 'is-active' : ''}`}
                  onClick={() => setAudience(audience.label)}
                >
                  {audience.label}
                  <span>{audience.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="filter-card">
            <div className="section-heading">
              <span>Commune</span>
              <small>{towns.length}</small>
            </div>
            <label className="select-field">
              <span>Filtrer par zone</span>
              <select value={selectedTown} onChange={(event) => setSelectedTown(event.target.value)}>
                <option value="all">Toute la Martinique</option>
                {towns.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`ghost-button ghost-button--wide ${favoritesOnly ? 'is-active' : ''}`}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              <Star size={16} />
              Favoris seulement
              <span>{visibleFavorites}</span>
            </button>
          </section>

          <section className="filter-card">
            <div className="section-heading">
              <span>Categories</span>
              <small>{metadata.categories.length}</small>
            </div>
            <div className="category-list">
              <button
                type="button"
                className={`category-button ${selectedCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setCategory('all')}
              >
                <span className="category-copy">
                  <strong>Tout l annuaire</strong>
                  <small>Toutes les structures synchronisees</small>
                </span>
                <span className="category-count">{metadata.totalRecords}</span>
              </button>

              {metadata.categories.map((category) => {
                const visual = categoryVisuals[category.id] ?? fallbackVisual
                const Icon = visual.icon

                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-button ${selectedCategory === category.id ? 'is-active' : ''}`}
                    onClick={() => setCategory(category.id)}
                  >
                    <span
                      className="category-icon"
                      style={{ backgroundColor: visual.softAccent, color: visual.accent }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="category-copy">
                      <strong>{category.label}</strong>
                      <small>{records.find((record) => record.categoryId === category.id)?.summary}</small>
                    </span>
                    <span className="category-count">{category.count}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="community-card">
            <p className="eyebrow">Contribuer</p>
            <h3>Ajouter ou corriger une fiche</h3>
            <p>
              Le site reste gratuit et simple a enrichir. Les suggestions ouvrent directement une
              issue GitHub pre-remplie.
            </p>

            <div className="community-actions">
              <a className="ghost-button ghost-button--wide" href={NEW_STRUCTURE_ISSUE_URL} target="_blank" rel="noreferrer">
                Proposer une structure
                <ExternalLink size={16} />
              </a>
              <a
                className="ghost-button ghost-button--wide"
                href={buildCorrectionIssueUrl(activeRecord)}
                target="_blank"
                rel="noreferrer"
              >
                Signaler une correction
                <ExternalLink size={16} />
              </a>
              <a className="ghost-button ghost-button--wide" href={REPO_URL} target="_blank" rel="noreferrer">
                Voir le depot
                <ExternalLink size={16} />
              </a>
            </div>
          </section>
        </aside>

        <section className="list-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Annuaire vivant</p>
              <h2>{filteredRecords.length} resultat(s)</h2>
              <p className="panel-copy">
                Derniere synchronisation officielle le {formatDateTime(metadata.generatedAt)}.
              </p>
            </div>
            <button className="ghost-button" type="button" onClick={resetFilters}>
              <RefreshCcw size={16} />
              Reinitialiser
            </button>
          </div>

          <div className="search-row">
            <label className="search-field">
              <Search size={18} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un service, une commune, un public ou un contact"
              />
            </label>
            <button
              type="button"
              className={`ghost-button ${favoritesOnly ? 'is-active' : ''}`}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              <Star size={16} />
              {favoritesOnly ? 'Tous' : 'Favoris'}
            </button>
          </div>

          <div className="active-filters">
            {selectedCategory !== 'all' ? <span className="filter-token">{selectedCategory}</span> : null}
            {selectedAudience !== 'all' ? <span className="filter-token">{selectedAudience}</span> : null}
            {selectedTown !== 'all' ? <span className="filter-token">{selectedTown}</span> : null}
            {favoritesOnly ? <span className="filter-token">Favoris</span> : null}
            {query ? <span className="filter-token">Recherche: {query}</span> : null}
          </div>

          <div className="results-list">
            {filteredRecords.length === 0 ? (
              <article className="empty-state">
                <HeartHandshake size={28} />
                <h3>Aucun resultat pour ces filtres</h3>
                <p>Essaie une autre commune, un autre public ou retire le filtre favoris.</p>
              </article>
            ) : (
              filteredRecords.map((record) => {
                const visual = categoryVisuals[record.categoryId] ?? fallbackVisual
                const Icon = visual.icon
                const isFavorite = favoriteSet.has(record.id)
                const isActive = activeRecord?.id === record.id

                return (
                  <article
                    key={record.id}
                    className={`result-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(record.id)}
                    style={
                      {
                        '--card-accent': visual.accent,
                        '--card-soft-accent': visual.softAccent,
                      } as CSSProperties
                    }
                  >
                    <div className="result-main">
                      <span className="result-icon">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="result-category">{record.categoryLabel}</p>
                        <h3>{record.name}</h3>
                        <p className="result-subtitle">{record.summary}</p>
                        <div className="result-meta">
                          <span>{record.town || 'Martinique'}</span>
                          {record.phoneNumbers[0] ? <span>{record.phoneNumbers[0]}</span> : null}
                          {record.emails[0] ? <span>{record.emails[0]}</span> : null}
                        </div>
                        <div className="badge-row">
                          {record.audiences.slice(0, 3).map((audience) => (
                            <span key={audience} className="badge">
                              {audience}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleFavorite(record.id)
                      }}
                    >
                      <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <aside className="detail-panel">
          {activeRecord ? (
            <>
              <section
                className="detail-hero"
                style={
                  {
                    '--detail-accent': activeVisual.accent,
                    '--detail-soft-accent': activeVisual.softAccent,
                  } as CSSProperties
                }
              >
                <div className="detail-header-row">
                  <span className="detail-icon">
                    <activeVisual.icon size={20} />
                  </span>
                  <button
                    type="button"
                    className={`favorite-button favorite-button--detail ${
                      favoriteSet.has(activeRecord.id) ? 'is-favorite' : ''
                    }`}
                    onClick={() => toggleFavorite(activeRecord.id)}
                  >
                    <Star size={18} fill={favoriteSet.has(activeRecord.id) ? 'currentColor' : 'none'} />
                    {favoriteSet.has(activeRecord.id) ? 'Favori' : 'Ajouter'}
                  </button>
                </div>

                <p className="eyebrow">{activeRecord.categoryLabel}</p>
                <h2>{activeRecord.name}</h2>
                <p className="detail-copy">
                  {activeRecord.description || activeRecord.summary || activeRecord.serviceType}
                </p>

                <div className="badge-row">
                  {activeRecord.audiences.map((audience) => (
                    <span key={audience} className="badge">
                      {audience}
                    </span>
                  ))}
                </div>
              </section>

              <section className="detail-actions">
                {activeRecord.phoneNumbers[0] ? (
                  <a className="primary-action" href={`tel:${activeRecord.phoneNumbers[0]}`}>
                    <Phone size={18} />
                    Appeler
                  </a>
                ) : null}
                {activeRecord.emails[0] ? (
                  <a className="primary-action" href={`mailto:${activeRecord.emails[0]}`}>
                    <Mail size={18} />
                    Ecrire
                  </a>
                ) : null}
                {directions ? (
                  <a className="primary-action" href={directions.google} target="_blank" rel="noreferrer">
                    <MapPinned size={18} />
                    Itineraire
                  </a>
                ) : null}
              </section>

              <section className="detail-card">
                <div className="section-heading">
                  <span>Coordonnees</span>
                  <small>{activeRecord.serviceType}</small>
                </div>

                <div className="info-stack">
                  <div className="info-line">
                    <MapPinned size={16} />
                    <div>
                      <strong>Adresse</strong>
                      <p>{activeRecord.address || 'Adresse non communiquee'}</p>
                    </div>
                  </div>

                  {activeRecord.phoneNumbers.map((phone) => (
                    <a key={phone} className="info-line info-line--link" href={`tel:${phone}`}>
                      <Phone size={16} />
                      <div>
                        <strong>Telephone</strong>
                        <p>{phone}</p>
                      </div>
                    </a>
                  ))}

                  {activeRecord.emails.map((email) => (
                    <a key={email} className="info-line info-line--link" href={`mailto:${email}`}>
                      <Mail size={16} />
                      <div>
                        <strong>Email</strong>
                        <p>{email}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              <section className="detail-card">
                <div className="section-heading">
                  <span>Se rendre sur place</span>
                  <small>{activeRecord.town}</small>
                </div>

                <div className="action-grid">
                  {directions ? (
                    <>
                      <a href={directions.google} target="_blank" rel="noreferrer">
                        Google Maps
                      </a>
                      <a href={directions.osm} target="_blank" rel="noreferrer">
                        OpenStreetMap
                      </a>
                      <a href={directions.apple} target="_blank" rel="noreferrer">
                        Apple Plans
                      </a>
                    </>
                  ) : (
                    <p className="muted-copy">Aucune coordonnee GPS disponible pour cette fiche.</p>
                  )}
                </div>

                {activeRecord.coordinates ? (
                  <p className="gps-copy">
                    GPS: {activeRecord.coordinates.latitude.toFixed(6)},{' '}
                    {activeRecord.coordinates.longitude.toFixed(6)}
                  </p>
                ) : null}
              </section>

              <section className="detail-card">
                <div className="section-heading">
                  <span>Horaires et infos</span>
                  <small>{activeRecord.tags.join(' · ')}</small>
                </div>

                {activeRecord.hours.length > 0 ? (
                  <ul className="hours-list">
                    {activeRecord.hours.map((hour) => (
                      <li key={hour}>{hour}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-copy">Horaires non disponibles dans la source officielle.</p>
                )}

                {activeRecord.website ? (
                  <a className="secondary-link" href={activeRecord.website} target="_blank" rel="noreferrer">
                    Voir le site internet
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </section>

              <section className="detail-card">
                <div className="section-heading">
                  <span>Source et fiabilite</span>
                  <small>Controle hebdomadaire</small>
                </div>

                <div className="info-stack">
                  <div className="info-line">
                    <ShieldCheck size={16} />
                    <div>
                      <strong>Derniere verification</strong>
                      <p>{formatDateTime(activeRecord.lastVerifiedAt)}</p>
                    </div>
                  </div>

                  <a className="secondary-link" href={activeRecord.sourceUrl} target="_blank" rel="noreferrer">
                    Ouvrir la fiche officielle
                    <ExternalLink size={16} />
                  </a>

                  <a
                    className="secondary-link"
                    href={buildCorrectionIssueUrl(activeRecord)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Signaler une correction
                    <ExternalLink size={16} />
                  </a>
                </div>
              </section>
            </>
          ) : (
            <section className="empty-state">
              <HeartHandshake size={28} />
              <h3>Aucune fiche selectionnee</h3>
              <p>Choisis une structure a gauche pour afficher son detail.</p>
            </section>
          )}
        </aside>
      </main>

      {!gateUnlocked ? (
        <div className="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
          <section className="gate-card">
            <span className="gate-badge">Entree solidaire</span>
            <h2 id="gate-title">Mini captcha social</h2>
            <p>
              Pour entrer, choisis la reponse la plus liee a la solidarite. C est un filtre simple
              pour cette premiere version statique.
            </p>

            <div className="quiz-block">
              <strong>{activeQuiz.prompt}</strong>
              <div className="quiz-options">
                {activeQuiz.options.map((option) => (
                  <button key={option} type="button" className="quiz-option" onClick={() => checkGate(option)}>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {gateFeedback ? <p className="gate-feedback">{gateFeedback}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
