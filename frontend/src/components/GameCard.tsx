import { useState } from 'react'
import { completeGame, startGame, toggleFavorite } from '../services/api'

interface GameCardProps {
  id: number
  title: string
  platform: string
  status: string
  rating?: number | null
  favorite?: boolean
  coverImage?: string | null
  onUpdated: (message: string) => void
  onDetails: (gameId: number) => void
}

function GameCard({
  id,
  title,
  platform,
  status,
  rating,
  favorite = false,
  coverImage,
  onUpdated,
  onDetails,
}: GameCardProps) {
  const [actionLoading, setActionLoading] = useState(false)

  async function handleStart() {
    setActionLoading(true)

    try {
      await startGame(id)
      onUpdated('Jogo iniciado.')
    } catch {
      onUpdated('Não foi possível iniciar o jogo.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleComplete() {
    setActionLoading(true)

    try {
      await completeGame(id)
      onUpdated('Jogo concluído.')
    } catch {
      onUpdated('Não foi possível concluir o jogo.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleFavorite() {
    setActionLoading(true)

    try {
      await toggleFavorite(id)

      onUpdated(
        favorite
          ? 'Jogo removido dos favoritos.'
          : 'Jogo adicionado aos favoritos.',
      )
    } catch {
      onUpdated('Não foi possível atualizar o favorito.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <article className="game-card">
      <div className="game-cover">
        {coverImage ? (
          <img src={coverImage} alt={`Capa de ${title}`} />
        ) : (
          <span className="game-cover-placeholder">🎮</span>
        )}

        <button
          className={`favorite-badge ${favorite ? 'favorite-active' : ''}`}
          onClick={handleFavorite}
          disabled={actionLoading}
          aria-label={
            favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
          }
        >
          {favorite ? '★' : '☆'}
        </button>
      </div>

      <div className="game-info">
        <h3>{title}</h3>

        <p className="game-platform">{platform}</p>

        <div className="game-meta">
          <span className="game-status">{status}</span>

          {rating !== null && rating !== undefined && (
            <span className="game-rating">★ {rating}/10</span>
          )}
        </div>

        <div className="game-actions">
          <button
            className="game-action-button"
            onClick={() => onDetails(id)}
            disabled={actionLoading}
          >
            Ver detalhes
          </button>

          {status === 'BACKLOG' && (
            <button
              className="game-action-button"
              onClick={handleStart}
              disabled={actionLoading}
            >
              {actionLoading ? 'Iniciando...' : '▶ Iniciar'}
            </button>
          )}

          {status === 'PLAYING' && (
            <button
              className="game-action-button"
              onClick={handleComplete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Concluindo...' : '✓ Concluir'}
            </button>
          )}

          {status === 'COMPLETED' && (
            <span className="completed-label">✓ Jogo concluído</span>
          )}
        </div>
      </div>
    </article>
  )
}

export default GameCard
