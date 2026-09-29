import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  analyzeGameSessionNotes,
  getGameSessionImage,
  getRecentGameSessions,
  updateGameSession,
  type GameSessionImage,
  type RecentGameSession,
} from '../services/api'
import './ActivityTimeline.css'

const PAGE_SIZE = 20

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${remainingMinutes} min`
  }

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes} min`
    : `${hours}h`
}

function TimelineImage({
  gameId,
  sessionId,
  image,
}: {
  gameId: number
  sessionId: number
  image: GameSessionImage
}) {
  const [imageUrl, setImageUrl] = useState('')
  const [nearViewport, setNearViewport] = useState(false)
  const placeholderRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const placeholder = placeholderRef.current
    if (!placeholder || imageUrl) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150px' },
    )
    observer.observe(placeholder)
    return () => observer.disconnect()
  }, [imageUrl])

  useEffect(() => {
    if (!nearViewport) {
      return
    }

    let active = true
    let objectUrl = ''

    void getGameSessionImage(gameId, sessionId, image.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) {
          setImageUrl(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => {
        if (active) {
          setImageUrl('')
        }
      })

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [gameId, sessionId, image.id, nearViewport])

  if (!imageUrl) {
    return (
      <span ref={placeholderRef} className="activity-image-placeholder">
        Print
      </span>
    )
  }

  return (
    <a
      className="activity-image-link"
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
    >
      <img src={imageUrl} alt={image.original_filename} loading="lazy" />
    </a>
  )
}

function ActivityTimeline({
  onOpenGame,
}: {
  onOpenGame: (gameId: number) => void
}) {
  const [sessions, setSessions] = useState<RecentGameSession[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [gameTitle, setGameTitle] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minDuration, setMinDuration] = useState('')
  const [maxDuration, setMaxDuration] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<{
    game_title?: string
    date_from?: string
    date_to?: string
    min_duration?: number
    max_duration?: number
  }>({})
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editPlayedAt, setEditPlayedAt] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingSessionId, setSavingSessionId] = useState<number | null>(null)
  const [analyzingNotes, setAnalyzingNotes] = useState(false)
  const [insights, setInsights] = useState<{
    summary: string
    highlights: string[]
    sessions_analyzed: number
  } | null>(null)

  async function loadPage(
    nextPage: number,
    filters = appliedFilters,
  ) {
    const isFirstPage = nextPage === 1
    if (isFirstPage) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError('')

    try {
      const data = await getRecentGameSessions(nextPage, PAGE_SIZE, filters)
      setSessions((current) =>
        isFirstPage ? data : [...current, ...data],
      )
      setPage(nextPage)
      setHasMore(data.length === PAGE_SIZE)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar a atividade recente.',
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void loadPage(1)
  }, [])

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minimum = minDuration ? Number(minDuration) : undefined
    const maximum = maxDuration ? Number(maxDuration) : undefined

    if (
      minimum !== undefined &&
      maximum !== undefined &&
      minimum > maximum
    ) {
      setError('A duração mínima não pode superar a duração máxima.')
      return
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError('A data inicial deve ser anterior ou igual à data final.')
      return
    }

    const filters = {
      game_title: gameTitle.trim() || undefined,
      date_from: dateFrom
        ? new Date(`${dateFrom}T00:00:00`).toISOString()
        : undefined,
      date_to: dateTo
        ? (() => {
            const endOfSelectedDay = new Date(`${dateTo}T00:00:00`)
            endOfSelectedDay.setDate(endOfSelectedDay.getDate() + 1)
            return endOfSelectedDay.toISOString()
          })()
        : undefined,
      min_duration: minimum,
      max_duration: maximum,
    }

    setAppliedFilters(filters)
    setSessions([])
    void loadPage(1, filters)
  }

  function handleResetFilters() {
    setGameTitle('')
    setDateFrom('')
    setDateTo('')
    setMinDuration('')
    setMaxDuration('')
    setAppliedFilters({})
    setSessions([])
    void loadPage(1, {})
  }

  function beginEditing(session: RecentGameSession) {
    const localDate = new Date(session.played_at)
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
    setEditingSessionId(session.id)
    setEditPlayedAt(localDate.toISOString().slice(0, 16))
    setEditDuration(String(session.duration_minutes))
    setEditNotes(session.notes ?? '')
    setError('')
  }

  async function handleSaveSession(session: RecentGameSession) {
    const duration = Number(editDuration)
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setError('A duração deve estar entre 1 minuto e 24 horas.')
      return
    }

    setSavingSessionId(session.id)
    setError('')
    try {
      const updated = await updateGameSession(session.game_id, session.id, {
        played_at: new Date(editPlayedAt).toISOString(),
        duration_minutes: duration,
        notes: editNotes.trim() || null,
      })
      setSessions((current) =>
        current
          .map((item) =>
            item.id === session.id ? { ...item, ...updated } : item,
          )
          .filter((item) => {
            const titleMatches = !appliedFilters.game_title ||
              item.game.title.toLocaleLowerCase().includes(
                appliedFilters.game_title.toLocaleLowerCase(),
              )
            const fromMatches = !appliedFilters.date_from ||
              new Date(item.played_at) >= new Date(appliedFilters.date_from)
            const toMatches = !appliedFilters.date_to ||
              new Date(item.played_at) < new Date(appliedFilters.date_to)
            const minMatches = appliedFilters.min_duration === undefined ||
              item.duration_minutes >= appliedFilters.min_duration
            const maxMatches = appliedFilters.max_duration === undefined ||
              item.duration_minutes <= appliedFilters.max_duration
            return titleMatches && fromMatches && toMatches && minMatches && maxMatches
          })
          .sort((a, b) =>
            new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
          ),
      )
      setEditingSessionId(null)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível editar a sessão.',
      )
    } finally {
      setSavingSessionId(null)
    }
  }

  async function handleAnalyzeNotes() {
    setAnalyzingNotes(true)
    setError('')
    try {
      setInsights(await analyzeGameSessionNotes())
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Não foi possível analisar as sessões.',
      )
    } finally {
      setAnalyzingNotes(false)
    }
  }

  const hasAppliedFilters = Object.values(appliedFilters).some(
    (value) => value !== undefined,
  )

  return (
    <section className="activity-page">
      <header className="activity-page-header">
        <div>
          <h2>Atividade recente</h2>
          <p>Veja suas sessões de jogo e os prints que registrou.</p>
        </div>
      </header>

      <form className="activity-filters" onSubmit={handleApplyFilters}>
        <label>
          Jogo
          <input
            type="search"
            value={gameTitle}
            onChange={(event) => setGameTitle(event.target.value)}
            placeholder="Buscar pelo nome do jogo"
          />
        </label>
        <label>
          De
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>
        <label>
          Duração mínima (min)
          <input
            type="number"
            min="1"
            max="1440"
            value={minDuration}
            onChange={(event) => setMinDuration(event.target.value)}
          />
        </label>
        <label>
          Duração máxima (min)
          <input
            type="number"
            min="1"
            max="1440"
            value={maxDuration}
            onChange={(event) => setMaxDuration(event.target.value)}
          />
        </label>
        <div className="activity-filter-actions">
          <button type="submit" disabled={loading || loadingMore}>
            Filtrar
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={loading || loadingMore}
          >
            Limpar
          </button>
        </div>
      </form>

      <section className="session-insights">
        <div className="session-insights-header">
          <div>
            <h3>Resumo inteligente</h3>
            <p>
              A IA analisa até 30 observações recentes. A análise só é feita
              quando você solicitar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleAnalyzeNotes()}
            disabled={analyzingNotes}
          >
            {analyzingNotes ? 'Analisando...' : 'Analisar observações'}
          </button>
        </div>
        {insights && (
          <div className="session-insights-result">
            <p>{insights.summary}</p>
            {insights.highlights.length > 0 && (
              <ul>
                {insights.highlights.map((highlight, index) => (
                  <li key={`${index}-${highlight}`}>{highlight}</li>
                ))}
              </ul>
            )}
            <span>
              Baseado em {insights.sessions_analyzed}{' '}
              {insights.sessions_analyzed === 1 ? 'sessão' : 'sessões'}
            </span>
          </div>
        )}
      </section>

      {error && <p className="activity-error" role="alert">{error}</p>}

      {loading ? (
        <p className="activity-message">Carregando sua atividade...</p>
      ) : sessions.length === 0 ? (
        <div className="activity-empty">
          <span aria-hidden="true">🕹️</span>
          <h3>
            {hasAppliedFilters
              ? 'Nenhuma sessão encontrada'
              : 'Nenhuma sessão registrada'}
          </h3>
          <p>
            {hasAppliedFilters
              ? 'Tente ajustar os filtros ou limpe-os para ver toda a atividade.'
              : 'Registre uma sessão nos detalhes de um jogo para vê-la aqui.'}
          </p>
          {hasAppliedFilters && (
            <button
              type="button"
              className="activity-empty-reset"
              onClick={handleResetFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <ol className="activity-timeline">
            {sessions.map((session) => (
              <li className="activity-entry" key={session.id}>
                <article className="activity-card">
                  <div className="activity-game">
                    {session.game.cover_image ? (
                      <img
                        src={session.game.cover_image}
                        alt=""
                        className="activity-game-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="activity-game-placeholder">🎮</span>
                    )}
                    <div className="activity-game-info">
                      <h3>{session.game.title}</h3>
                      <span>{session.game.platform}</span>
                    </div>
                    <button
                      type="button"
                      className="activity-open-game"
                      onClick={() => onOpenGame(session.game.id)}
                    >
                      Ver jogo
                    </button>
                  </div>

                  {editingSessionId === session.id ? (
                    <form
                      className="activity-edit-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleSaveSession(session)
                      }}
                    >
                      <label>
                        Data e horário
                        <input
                          type="datetime-local"
                          value={editPlayedAt}
                          onChange={(event) => setEditPlayedAt(event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Duração (minutos)
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={editDuration}
                          onChange={(event) => setEditDuration(event.target.value)}
                          required
                        />
                      </label>
                      <label className="activity-edit-notes">
                        Observações
                        <textarea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          maxLength={2000}
                          rows={3}
                        />
                      </label>
                      <div className="activity-edit-actions">
                        <button
                          type="submit"
                          disabled={savingSessionId === session.id}
                        >
                          {savingSessionId === session.id ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          disabled={savingSessionId === session.id}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="activity-session-meta">
                        <time dateTime={session.played_at}>
                          {new Date(session.played_at).toLocaleString('pt-BR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </time>
                        <span>{formatDuration(session.duration_minutes)}</span>
                      </div>

                      {session.notes && (
                        <p className="activity-notes">{session.notes}</p>
                      )}

                      <button
                        type="button"
                        className="activity-edit-button"
                        onClick={() => beginEditing(session)}
                      >
                        Editar sessão
                      </button>
                    </>
                  )}

                  {session.images.length > 0 && (
                    <div className="activity-images">
                      {session.images.map((image) => (
                        <TimelineImage
                          key={image.id}
                          gameId={session.game_id}
                          sessionId={session.id}
                          image={image}
                        />
                      ))}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>

          {hasMore && (
            <button
              type="button"
              className="activity-load-more"
              onClick={() => void loadPage(page + 1)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais sessões'}
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default ActivityTimeline
