import i18n, { formatNumber } from '../i18n'
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
        <p>{i18n.t("Carregando estatísticas...")}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="statistics-page">
        <button className="close-button" onClick={onClose}>

          {i18n.t("← Voltar")}
        </button>

        <div className="library-message error">
          <p>{i18n.t(error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="statistics-page">
      <div className="statistics-header">
        <div>
          <h2>{i18n.t("Estatísticas")}</h2>
          <p>{i18n.t("Acompanhe os números da sua biblioteca.")}</p>
        </div>

        <button className="close-button" onClick={onClose}>

          {i18n.t("← Voltar")}
        </button>
      </div>

      <section className="statistics-grid">
        <article className="stat-card">
          <span className="stat-icon">🎮</span>
          <div>
            <strong>{i18n.t("Total de jogos")}</strong>
            <span>{formatNumber(stats.total_games)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">📚</span>
          <div>
            <strong>{i18n.t("Backlog")}</strong>
            <span>{formatNumber(stats.backlog)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">▶️</span>
          <div>
            <strong>{i18n.t("Jogando")}</strong>
            <span>{formatNumber(stats.playing)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <strong>{i18n.t("Concluídos")}</strong>
            <span>{formatNumber(stats.completed)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⭐</span>
          <div>
            <strong>{i18n.t("Favoritos")}</strong>
            <span>{formatNumber(stats.favorite_games)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⏱️</span>
          <div>
            <strong>{i18n.t("Horas jogadas")}</strong>
            <span>{formatNumber(stats.total_hours)} {i18n.t("h")}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🏆</span>
          <div>
            <strong>{i18n.t("Média das avaliações")}</strong>
            <span>
              {stats.average_rating !== null
                ? `${formatNumber(stats.average_rating, { maximumFractionDigits: 1 })}/10`
                : i18n.t("Não avaliado")}
            </span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">📌</span>
          <div>
            <strong>{i18n.t("Wishlist")}</strong>
            <span>{formatNumber(stats.wishlist)}</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🚫</span>
          <div>
            <strong>{i18n.t("Abandonados")}</strong>
            <span>{formatNumber(stats.dropped)}</span>
          </div>
        </article>
      </section>

      {sessionStatsError && (
        <p className="session-stats-error" role="alert">
          {i18n.t(sessionStatsError)}
        </p>
      )}

      {sessionStats && (
        <section className="session-statistics">
          <div className="session-statistics-heading">
            <div>
              <h3>{i18n.t("Atividade registrada")}</h3>
              <p>{i18n.t("Dados calculados a partir das sessões que você registrou.")}</p>
            </div>
            <div className="session-stat-total">
              <strong>{sessionStats.total_hours}{i18n.t("h")}</strong>
              <span>{sessionStats.total_sessions}  {i18n.t("sessões")}</span>
            </div>
          </div>

          <div className="session-statistics-panels">
            <div className="session-chart-panel">
              <h4>{i18n.t("Horas por mês")}</h4>
              <div className="session-month-chart" role="list">
                {sessionStats.monthly_hours.map((item) => {
                  const maximumHours = Math.max(
                    ...sessionStats.monthly_hours.map((month) => month.hours),
                    1,
                  )
                  const monthDate = new Date(`${item.month}-01T00:00:00`)
                  const label = monthDate.toLocaleDateString(i18n.language, {
                    month: 'short',
                  })

                  return (
                    <div
                      className="session-month-column"
                      key={item.month}
                      role="listitem"
                      title={`${item.hours}h`}
                    >
                      <span>{item.hours > 0 ? formatNumber(item.hours, { maximumFractionDigits: 1 }) : ''}</span>
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
              <h4>{i18n.t("Jogos com mais horas registradas")}</h4>
              {sessionStats.most_played_games.length === 0 ? (
                <p>{i18n.t("Nenhuma sessão registrada ainda.")}</p>
              ) : (
                <ol>
                  {sessionStats.most_played_games.map((game) => (
                    <li key={game.game_id}>
                      <div>
                        <strong>{game.title}</strong>
                        <span>
                          {formatNumber(game.sessions)}{' '}
                          {game.sessions === 1 ? i18n.t("sessão") : i18n.t("sessões")}
                        </span>
                      </div>
                      <b>{formatNumber(game.minutes / 60, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {i18n.t("h")}</b>
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
          <h3>{i18n.t("Resumo da biblioteca")}</h3>
          <span>{formatNumber(stats.total_games)}  {i18n.t("jogos")}</span>
        </div>

        <div className="statistics-status-list">
          <div className="statistics-status-item">
            <div>
              <span>{i18n.t("📚 Backlog")}</span>
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
              <span>{i18n.t("▶️ Jogando")}</span>
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
              <span>{i18n.t("✅ Concluídos")}</span>
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
          <h3>{i18n.t("Tipos de jogo")}</h3>
          <span>{stats.standard_games + stats.ongoing_games}  {i18n.t("jogos")}</span>
        </div>

        <div className="statistics-status-list">
          {[
            {
              label: i18n.t("🎮 Tradicionais"),
              count: stats.standard_games,
              ongoing: false,
            },
            {
              label: i18n.t("🔄 Contínuos"),
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
