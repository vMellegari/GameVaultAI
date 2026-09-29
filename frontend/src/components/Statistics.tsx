import { useEffect, useState } from 'react'

import {
  getGameSessionStats,
  getGameStats,
  type GameSessionStats as GameSessionStatsData,
} from '../services/api'
import './Statistics.css'

interface GameStats {
  total_games: number
  backlog: number
  playing: number
  completed: number
  dropped: number
  wishlist: number
  favorite_games: number
  standard_games: number
  ongoing_games: number
  total_hours: number
  average_rating: number | null
}

interface StatisticsProps {
  onClose: () => void
}

function Statistics({ onClose }: StatisticsProps) {
  const [stats, setStats] = useState<GameStats | null>(null)
  const [sessionStats, setSessionStats] = useState<GameSessionStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionStatsError, setSessionStatsError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      setError('')

      try {
        const [libraryResult, sessionsResult] = await Promise.allSettled([
          getGameStats(),
          getGameSessionStats(),
        ])

        if (libraryResult.status === 'fulfilled') {
          setStats(libraryResult.value)
        } else {
          setError('Não foi possível carregar as estatísticas da biblioteca.')
        }

        if (sessionsResult.status === 'fulfilled') {
          setSessionStats(sessionsResult.value)
        } else {
          setSessionStatsError(
            'Não foi possível carregar as estatísticas das sessões.',
          )
        }
      } catch {
        setError('Não foi possível carregar as estatísticas da biblioteca.')
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

  if (!stats) {
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

      {sessionStatsError && (
        <p className="session-stats-error" role="alert">
          {sessionStatsError}
        </p>
      )}

      {sessionStats && (
        <section className="session-statistics">
          <div className="session-statistics-heading">
            <div>
              <h3>Atividade registrada</h3>
              <p>Dados calculados a partir das sessões que você registrou.</p>
            </div>
            <div className="session-stat-total">
              <strong>{sessionStats.total_hours}h</strong>
              <span>{sessionStats.total_sessions} sessões</span>
            </div>
          </div>

          <div className="session-statistics-panels">
            <div className="session-chart-panel">
              <h4>Horas por mês</h4>
              <div className="session-month-chart" role="list">
                {sessionStats.monthly_hours.map((item) => {
                  const maximumHours = Math.max(
                    ...sessionStats.monthly_hours.map((month) => month.hours),
                    1,
                  )
                  const monthDate = new Date(`${item.month}-01T00:00:00`)
                  const label = monthDate.toLocaleDateString('pt-BR', {
                    month: 'short',
                  })

                  return (
                    <div
                      className="session-month-column"
                      key={item.month}
                      role="listitem"
                      title={`${item.hours}h`}
                    >
                      <span>{item.hours > 0 ? item.hours : ''}</span>
                      <div className="session-month-bar-track">
                        <div
                          className="session-month-bar"
                          style={{
                            height: `${Math.max(
                              (item.hours / maximumHours) * 100,
                              item.hours > 0 ? 5 : 0,
                            )}%`,
                          }}
                        />
                      </div>
                      <small>{label}</small>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="session-top-games">
              <h4>Jogos com mais horas registradas</h4>
              {sessionStats.most_played_games.length === 0 ? (
                <p>Nenhuma sessão registrada ainda.</p>
              ) : (
                <ol>
                  {sessionStats.most_played_games.map((game) => (
                    <li key={game.game_id}>
                      <div>
                        <strong>{game.title}</strong>
                        <span>
                          {game.sessions}{' '}
                          {game.sessions === 1 ? 'sessão' : 'sessões'}
                        </span>
                      </div>
                      <b>{(game.minutes / 60).toFixed(1)}h</b>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>
      )}

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

      <section className="statistics-summary">
        <div className="statistics-summary-header">
          <h3>Tipos de jogo</h3>
          <span>{stats.standard_games + stats.ongoing_games} jogos</span>
        </div>

        <div className="statistics-status-list">
          {[
            {
              label: '🎮 Tradicionais',
              count: stats.standard_games,
              ongoing: false,
            },
            {
              label: '🔄 Contínuos',
              count: stats.ongoing_games,
              ongoing: true,
            },
          ].map((gameType) => {
            const percentage =
              stats.total_games > 0
                ? Math.round((gameType.count / stats.total_games) * 100)
                : 0

            return (
              <div className="statistics-status-item" key={gameType.label}>
                <div>
                  <span>{gameType.label}</span>
                  <strong>
                    {gameType.count} — {percentage}%
                  </strong>
                </div>

                <div className="statistics-progress">
                  <div
                    className={`statistics-progress-fill${
                      gameType.ongoing ? ' ongoing' : ''
                    }`}
                    role="progressbar"
                    aria-label={gameType.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Statistics
