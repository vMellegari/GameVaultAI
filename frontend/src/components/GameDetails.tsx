import { useEffect, useState } from 'react'
import {
  deleteGame,
  getGame,
  getGameScreenshots,
  toggleFavorite,
  updateGame,
} from '../services/api'
import { deleteLocalGameplayClipsForGame } from '../services/localGameplayClipStore'
import GameSessions from './GameSessions'
import './GameDetails.css'

interface Game {
  id: number
  title: string
  platform: string
  status: string
  game_type: 'STANDARD' | 'ONGOING'
  personal_rating: number | null
  hours_played: number
  favorite: boolean
  notes: string | null
  cover_image: string | null
  release_date: string | null
  genres: string | null
  metacritic_score: number | null
  completed_at: string | null
}

interface GameDetailsProps {
  gameId: number
  onClose: () => void
  onUpdated: (game: Game) => void
  onDeleted: () => void
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    BACKLOG: 'Backlog',
    PLAYING: 'Jogando',
    COMPLETED: 'Concluído',
  }

  return labels[status] || status
}

function GameDetails({
  gameId,
  onClose,
  onUpdated,
  onDeleted,
}: GameDetailsProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [screenshotResult, setScreenshotResult] = useState<{
    gameId: number
    images: string[]
    error?: string
  } | null>(null)
  const [screenshotRetry, setScreenshotRetry] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [updatingFavorite, setUpdatingFavorite] = useState(false)

  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')
  const [gameType, setGameType] = useState<'STANDARD' | 'ONGOING'>('STANDARD')
  const [rating, setRating] = useState('')
  const [hoursPlayed, setHoursPlayed] = useState('')
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    async function loadGame() {
      setLoading(true)
      setError('')

      try {
        const data = await getGame(gameId)

        setGame(data)

        setPlatform(data.platform)
        setStatus(data.status)
        setGameType(data.game_type)
        setRating(
          data.personal_rating !== null ? String(data.personal_rating) : '',
        )
        setHoursPlayed(String(data.hours_played))
        setNotes(data.notes || '')
        setFavorite(data.favorite)
      } catch {
        setError('Não foi possível carregar os detalhes do jogo.')
      } finally {
        setLoading(false)
      }
    }

    loadGame()
  }, [gameId])

  useEffect(() => {
    let cancelled = false

    getGameScreenshots(gameId)
      .then((images) => {
        if (!cancelled) {
          setScreenshotResult({ gameId, images })
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setScreenshotResult({
            gameId,
            images: [],
            error:
              requestError instanceof Error
                ? requestError.message
                : 'Não foi possível carregar as screenshots.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [gameId, screenshotRetry])

  const screenshots =
    screenshotResult?.gameId === gameId ? screenshotResult.images : []

  const galleryImages = game
    ? Array.from(
        new Set(
          [game.cover_image, ...screenshots].filter(
            (image): image is string => Boolean(image),
          ),
        ),
      )
    : []

  useEffect(() => {
    if (!galleryOpen || galleryImages.length < 2) {
      return
    }

    const intervalId = window.setInterval(() => {
      setGalleryIndex((currentIndex) => (currentIndex + 1) % galleryImages.length)
    }, 6000)

    return () => window.clearInterval(intervalId)
  }, [galleryOpen, galleryImages.length])

  useEffect(() => {
    if (!galleryOpen) {
      return
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setGalleryOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [galleryOpen])

  function showPreviousGalleryImage() {
    setGalleryIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length)
  }

  function showNextGalleryImage() {
    setGalleryIndex((index) => (index + 1) % galleryImages.length)
  }

  async function handleToggleFavorite() {
    if (!game || updatingFavorite) {
      return
    }

    setUpdatingFavorite(true)
    setError('')

    try {
      const updatedGame = await toggleFavorite(game.id)
      setGame(updatedGame)
      setFavorite(updatedGame.favorite)
      onUpdated(updatedGame)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar o favorito.',
      )
    } finally {
      setUpdatingFavorite(false)
    }
  }

  async function handleSave() {
    if (!game) {
      return
    }

    const numericRating = rating === '' ? null : Number(rating)
    const numericHours = Number(hoursPlayed)

    if (
      numericRating !== null &&
      (Number.isNaN(numericRating) || numericRating < 0 || numericRating > 10)
    ) {
      setError('A nota deve estar entre 0 e 10.')
      return
    }

    if (Number.isNaN(numericHours) || numericHours < 0) {
      setError('As horas jogadas não podem ser negativas.')
      return
    }

    if (gameType === 'ONGOING' && status === 'COMPLETED') {
      setError('Jogos contínuos não podem ter o status Concluído.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const updatedGame = await updateGame(game.id, {
        platform,
        status,
        game_type: gameType,
        personal_rating: numericRating,
        hours_played: numericHours,
        notes: notes || null,
        favorite,
      })

      setGame(updatedGame)
      setEditing(false)
      onUpdated(updatedGame)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar as alterações.',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (!game) {
      return
    }

    setPlatform(game.platform)
    setStatus(game.status)
    setGameType(game.game_type)
    setRating(game.personal_rating !== null ? String(game.personal_rating) : '')
    setHoursPlayed(String(game.hours_played))
    setNotes(game.notes || '')
    setFavorite(game.favorite)

    setEditing(false)
    setError('')
  }

  function handleClose() {
    if (editing) {
      handleCancel()
    }

    onClose()
  }

  async function handleDelete() {
    if (!game) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      await deleteGame(game.id)
      await deleteLocalGameplayClipsForGame(game.id).catch(() => {})
      onDeleted()
      onClose()
    } catch {
      setError('Não foi possível excluir o jogo.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirmation(false)
    }
  }

  if (loading) {
    return (
      <div className="details-page">
        <p>Carregando detalhes...</p>
      </div>
    )
  }

  if (error && !game) {
    return (
      <div className="details-page">
        <button className="close-button" onClick={handleClose}>
          ← Voltar
        </button>

        <div className="library-message error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return null
  }

  return (
    <div className="details-page">
      <div className="details-header">
        <button className="close-button" onClick={onClose}>
          ← Voltar
        </button>
      </div>

      {error && <p className="details-error">{error}</p>}

      <div className="game-details-layout">
        <section className="details-card">
          <div className="details-media">
            <div className="details-cover">
              {game.cover_image ? (
                <img src={game.cover_image} alt={`Capa de ${game.title}`} />
              ) : (
                <span>🎮</span>
              )}
            </div>
            {galleryImages.length > 1 && (
              <button
                className="details-gallery-trigger"
                type="button"
                onClick={() => {
                  setGalleryIndex(0)
                  setGalleryOpen(true)
                }}
              >
                ▧ Ver galeria ({galleryImages.length})
              </button>
            )}
            {screenshotResult?.gameId === gameId && galleryImages.length < 2 && (
              <div className="details-gallery-feedback" role="status">
                <span>
                  {screenshotResult.error ||
                    'A RAWG não retornou screenshots adicionais para este jogo.'}
                </span>
                {screenshotResult.error && (
                  <button
                    type="button"
                    onClick={() => setScreenshotRetry((attempt) => attempt + 1)}
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="details-info">
            <div className="details-title-row">
              <div>
                <h2>{game.title}</h2>
              </div>

              {!editing && (
                <button
                  className={`details-favorite${game.favorite ? ' is-favorite' : ''}`}
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={updatingFavorite}
                  aria-pressed={game.favorite}
                  aria-label={
                    game.favorite
                      ? 'Remover jogo dos favoritos'
                      : 'Adicionar jogo aos favoritos'
                  }
                >
                  {updatingFavorite
                    ? 'Salvando...'
                    : game.favorite
                      ? '★ Favorito'
                      : '☆ Favoritar'}
                </button>
              )}
            </div>

            <div className="details-status">
              {editing ? (
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setError('')
                  }}
                >
                  <option value="BACKLOG">Backlog</option>

                  <option value="PLAYING">Jogando</option>

                  <option value="COMPLETED" disabled={gameType === 'ONGOING'}>
                    Concluído
                  </option>
                </select>
              ) : (
                <span>{getStatusLabel(game.status)}</span>
              )}
            </div>

            <div className="details-grid">
              <div>
                <strong>Tipo de experiência</strong>

                {editing ? (
                  <select
                    value={gameType}
                    onChange={(event) => {
                      setGameType(event.target.value as 'STANDARD' | 'ONGOING')
                      setError('')
                    }}
                  >
                    <option value="STANDARD">Tradicional</option>
                    <option value="ONGOING" disabled={status === 'COMPLETED'}>
                      Contínua
                    </option>
                  </select>
                ) : (
                  <span>
                    {game.game_type === 'ONGOING' ? 'Contínua' : 'Tradicional'}
                  </span>
                )}
              </div>

              <div>
                <strong>Plataforma</strong>

                {editing ? (
                  <input
                    type="text"
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                  />
                ) : (
                  <span>{game.platform}</span>
                )}
              </div>

              <div>
                <strong>Nota pessoal</strong>

                {editing ? (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    placeholder="0 a 10"
                  />
                ) : (
                  <span>
                    {game.personal_rating !== null
                      ? `★ ${game.personal_rating}/10`
                      : 'Não avaliado'}
                  </span>
                )}
              </div>

              <div>
                <strong>Horas jogadas</strong>

                {editing ? (
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={hoursPlayed}
                    onChange={(event) => setHoursPlayed(event.target.value)}
                  />
                ) : (
                  <span>{game.hours_played}h</span>
                )}
              </div>

              <div>
                <strong>Metacritic</strong>

                <span>
                  {game.metacritic_score !== null
                    ? game.metacritic_score
                    : 'Não disponível'}
                </span>
              </div>

              <div>
                <strong>Lançamento</strong>

                <span>{game.release_date || 'Não disponível'}</span>
              </div>

              <div>
                <strong>Data de conclusão</strong>
                <span>
                  {game.game_type === 'ONGOING'
                    ? 'Não se aplica'
                    : game.completed_at
                    ? new Date(game.completed_at).toLocaleDateString('pt-BR')
                    : 'Não concluído'}
                </span>
              </div>
            </div>

            {game.genres && (
              <div className="details-section">
                <strong>Gêneros</strong>
                <p>{game.genres}</p>
              </div>
            )}

            <div className="details-section">
              <strong>Observações</strong>

              {editing ? (
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Adicione suas observações..."
                  rows={4}
                />
              ) : (
                <p>{game.notes || 'Nenhuma observação adicionada.'}</p>
              )}
            </div>

            {editing && (
              <label className="favorite-checkbox">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(event) => setFavorite(event.target.checked)}
                />
                Favorito
              </label>
            )}

            <div className="details-actions">
              {editing ? (
                <>
                  <button
                    className="details-save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>

                  <button
                    className="details-cancel-button"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="details-edit-button"
                    onClick={() => setEditing(true)}
                  >
                    ✎ Editar jogo
                  </button>

                  <button
                    className="details-delete-button"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    🗑 Excluir jogo
                  </button>
                </>
              )}
            </div>
            {showDeleteConfirmation && (
              <div className="delete-confirmation">
                <div>
                  <strong>Excluir este jogo?</strong>

                  <p>Essa ação não pode ser desfeita.</p>
                </div>

                <div className="delete-confirmation-actions">
                  <button
                    className="details-cancel-button"
                    onClick={() => setShowDeleteConfirmation(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>

                  <button
                    className="details-delete-confirm-button"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <GameSessions
          gameId={game.id}
          gameTitle={game.title}
          onHoursChanged={(changeInHours) => {
            const updatedGame = {
              ...game,
              hours_played: Math.max(
                0,
                Math.round((game.hours_played + changeInHours) * 100) / 100,
              ),
            }
            setGame(updatedGame)
            setHoursPlayed(String(updatedGame.hours_played))
            onUpdated(updatedGame)
          }}
        />
      </div>
      {galleryOpen && galleryImages.length > 0 && (
        <div
          className="details-gallery-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setGalleryOpen(false)
            }
          }}
        >
          <section
            className="details-gallery-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-gallery-title"
          >
            <header className="details-gallery-header">
              <h2 id="details-gallery-title">Imagens de {game.title}</h2>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                aria-label="Fechar galeria"
              >
                ×
              </button>
            </header>
            <img
              className="details-gallery-image"
              src={galleryImages[galleryIndex]}
              alt={`${game.title} — imagem ${galleryIndex + 1}`}
            />
            {galleryImages.length > 1 && (
              <div className="details-gallery-controls">
                <button type="button" onClick={showPreviousGalleryImage} aria-label="Imagem anterior">
                  ← Anterior
                </button>
                <span>
                  {galleryIndex + 1} / {galleryImages.length} · troca automática
                </span>
                <button type="button" onClick={showNextGalleryImage} aria-label="Próxima imagem">
                  Próxima →
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default GameDetails
