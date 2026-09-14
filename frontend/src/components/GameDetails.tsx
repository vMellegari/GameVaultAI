import { useEffect, useState } from 'react'
import { getGame, updateGame } from '../services/api'

interface Game {
  id: number
  title: string
  platform: string
  status: string
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
}

function GameDetails({ gameId, onClose }: GameDetailsProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')
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

  async function handleSave() {
    if (!game) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const updatedGame = await updateGame(game.id, {
        platform,
        status,
        personal_rating: rating === '' ? null : Number(rating),
        hours_played: Number(hoursPlayed),
        notes: notes || null,
        favorite,
      })

      setGame(updatedGame)
      setEditing(false)
    } catch {
      setError('Não foi possível salvar as alterações.')
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
    setRating(game.personal_rating !== null ? String(game.personal_rating) : '')
    setHoursPlayed(String(game.hours_played))
    setNotes(game.notes || '')
    setFavorite(game.favorite)

    setEditing(false)
    setError('')
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
        <button className="close-button" onClick={onClose}>
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

      <section className="details-card">
        <div className="details-cover">
          {game.cover_image ? (
            <img src={game.cover_image} alt={`Capa de ${game.title}`} />
          ) : (
            <span>🎮</span>
          )}
        </div>

        <div className="details-info">
          <div className="details-title-row">
            <div>
              <h2>{game.title}</h2>

              <p className="details-platform">{game.platform}</p>
            </div>

            {!editing && (
              <span className="details-favorite">
                {game.favorite ? '★ Favorito' : '☆'}
              </span>
            )}
          </div>

          <div className="details-status">
            {editing ? (
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="BACKLOG">Backlog</option>

                <option value="PLAYING">Jogando</option>

                <option value="COMPLETED">Concluído</option>
              </select>
            ) : (
              <span>{game.status}</span>
            )}
          </div>

          <div className="details-grid">
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
              <button
                className="details-edit-button"
                onClick={() => setEditing(true)}
              >
                ✎ Editar jogo
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default GameDetails
