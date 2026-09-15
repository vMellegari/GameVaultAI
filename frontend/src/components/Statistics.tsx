import { useEffect, useState } from 'react'

import { getGameStats } from '../services/api'

interface GameStats {
  total_games: number
  backlog: number
  playing: number
  completed: number
  dropped: number
  wishlist: number
  favorite_games: number
  total_hours: number
  average_rating: number | null
}

interface StatisticsProps {
  onClose: () => void
}

function Statistics({ onClose }: StatisticsProps) {
  const [stats, setStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      setError('')

      try {
        const data = await getGameStats()
        setStats(data)
      } catch {
        setError('Não foi possível carregar as estatísticas.')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="statistics-page">
        <p>Carregando estatísticas...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="statistics-page">
        <button className="close-button" onClick={onClose}>
          ← Voltar
        </button>

        <div className="library-message error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="statistics-page">
      <div className="statistics-header">
        <div>
          <h2>Estatísticas</h2>
          <p>Acompanhe os números da sua biblioteca.</p>
        </div>

        <button className="close-button" onClick={onClose}>
          ← Voltar
        </button>
      </div>

      <section className="statistics-grid">
        <article className="stat-card">
          <span className="stat-icon">🎮</span>
          <div>
            <strong>Total de jogos</strong>
            <span>{stats.total_games}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">📚</span>
          <div>
            <strong>Backlog</strong>
            <span>{stats.backlog}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">▶️</span>
          <div>
            <strong>Jogando</strong>
            <span>{stats.playing}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <strong>Concluídos</strong>
            <span>{stats.completed}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⭐</span>
          <div>
            <strong>Favoritos</strong>
            <span>{stats.favorite_games}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⏱️</span>
          <div>
            <strong>Horas jogadas</strong>
            <span>{stats.total_hours}h</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🏆</span>
          <div>
            <strong>Média das avaliações</strong>
            <span>
              {stats.average_rating !== null
                ? `${stats.average_rating}/10`
                : 'Não avaliado'}
            </span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">📌</span>
          <div>
            <strong>Wishlist</strong>
            <span>{stats.wishlist}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🚫</span>
          <div>
            <strong>Abandonados</strong>
            <span>{stats.dropped}</span>
          </div>
        </article>
      </section>

      <section className="statistics-summary">
        <div className="statistics-summary-header">
          <h3>Resumo da biblioteca</h3>
          <span>{stats.total_games} jogos</span>
        </div>

        <div className="statistics-status-list">
          <div className="statistics-status-item">
            <div>
              <span>📚 Backlog</span>
              <strong>
                {stats.backlog} —{' '}
                {stats.total_games > 0
                  ? `${Math.round((stats.backlog / stats.total_games) * 100)}%`
                  : '0%'}
              </strong>
            </div>

            <div className="statistics-progress">
              <div
                className="statistics-progress-fill"
                style={{
                  width:
                    stats.total_games > 0
                      ? `${(stats.backlog / stats.total_games) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>

          <div className="statistics-status-item">
            <div>
              <span>▶️ Jogando</span>
              <strong>
                {stats.playing} —{' '}
                {stats.total_games > 0
                  ? `${Math.round((stats.playing / stats.total_games) * 100)}%`
                  : '0%'}
              </strong>
            </div>

            <div className="statistics-progress">
              <div
                className="statistics-progress-fill"
                style={{
                  width:
                    stats.total_games > 0
                      ? `${(stats.playing / stats.total_games) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>

          <div className="statistics-status-item">
            <div>
              <span>✅ Concluídos</span>
              <strong>
                {stats.completed} —{' '}
                {stats.total_games > 0
                  ? `${Math.round(
                      (stats.completed / stats.total_games) * 100,
                    )}%`
                  : '0%'}
              </strong>
            </div>

            <div className="statistics-progress">
              <div
                className="statistics-progress-fill"
                style={{
                  width:
                    stats.total_games > 0
                      ? `${(stats.completed / stats.total_games) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Statistics
