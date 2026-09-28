import { useCallback, useEffect, useState } from 'react'
import Login from './components/Login'
import GameCard from './components/GameCard'
import GameSearch from './components/GameSearch'
import GameDetails from './components/GameDetails'
import Statistics from './components/Statistics'
import { getGames, getRecommendations, importGame } from './services/api'
import RecommendationList from './components/RecommendationList'
import './App.css'
import './styles/shared.css'

interface Game {
  id: number
  title: string
  rawg_id: number | null
  platform: string
  status: string
  game_type: 'STANDARD' | 'ONGOING'
  personal_rating: number | null
  hours_played: number
  favorite: boolean
  cover_image: string | null
}

type Filter = 'all' | 'backlog' | 'playing' | 'completed' | 'favorites'
const PAGE_SIZE = 10

function matchesActiveFilter(game: Game, filter: Filter) {
  if (filter === 'favorites') {
    return game.favorite
  }

  if (filter === 'backlog') {
    return game.status === 'BACKLOG'
  }

  if (filter === 'playing') {
    return game.status === 'PLAYING'
  }

  if (filter === 'completed') {
    return game.status === 'COMPLETED'
  }

  return true
}

function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('access_token')),
  )

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMoreGames, setHasMoreGames] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [showStatistics, setShowStatistics] = useState(false)
  const [recommendations, setRecommendations] = useState<
    {
      rawg_id: number
      title: string
      genres: string[]
      reason: string
      cover_image: string | null
    }[]
  >([])

  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  const loadGames = useCallback(
    async (
      filter: Filter = activeFilter,
      pageToLoad = 1,
      append = false,
    ) => {
      if (append) {
        setLoadingMore(true)
        setLoadMoreError('')
      } else {
        setLoading(true)
        setError('')
      }

      try {
        let status: string | undefined
        let favorite: boolean | undefined

        if (filter === 'backlog') {
          status = 'BACKLOG'
        }

        if (filter === 'playing') {
          status = 'PLAYING'
        }

        if (filter === 'completed') {
          status = 'COMPLETED'
        }

        if (filter === 'favorites') {
          favorite = true
        }

        const data: Game[] = await getGames(
          status,
          favorite,
          pageToLoad,
          PAGE_SIZE,
        )

        setGames((currentGames) => {
          const nextGames = append
            ? [...currentGames, ...data]
            : data

          return nextGames.sort((a, b) =>
            a.title.localeCompare(b.title, 'pt-BR', {
              sensitivity: 'base',
            }),
          )
        })
        setPage(pageToLoad)
        setHasMoreGames(data.length === PAGE_SIZE)
      } catch (err) {
        if (err instanceof Error && err.message === 'Sessão expirada.') {
          setAuthenticated(false)
          return
        }

        if (append) {
          setLoadMoreError('Não foi possível carregar mais jogos.')
        } else {
          setError('Não foi possível carregar sua biblioteca.')
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeFilter],
  )

  function handleGameUpdated(message: string, gameId: number, action: string) {
    setActionMessage(message)

    setGames((currentGames) => {
      const updatedGames = currentGames
        .map((game) => {
          if (game.id !== gameId) {
            return game
          }

          if (action === 'start') {
            return {
              ...game,
              status: 'PLAYING',
            }
          }

          if (action === 'complete') {
            return {
              ...game,
              status: 'COMPLETED',
            }
          }

          if (action === 'favorite') {
            return {
              ...game,
              favorite: !game.favorite,
            }
          }

          return game
        })
        .filter((game) => matchesActiveFilter(game, activeFilter))

      return updatedGames
    })

    setTimeout(() => setActionMessage(''), 2500)
  }

  async function handleRecommendations() {
    try {
      setLoadingRecommendations(true)

      const data = await getRecommendations()

      setRecommendations(data.recommendations)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  async function handleAddRecommendationToLibrary(rawgId: number) {
    try {
      const newGame = await importGame(rawgId)

      setGames((currentGames) => {
        const updatedGames = [...currentGames, newGame]

        return updatedGames.sort((a, b) =>
          a.title.localeCompare(b.title, 'pt-BR', {
            sensitivity: 'base',
          }),
        )
      })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (authenticated) {
      const timeoutId = window.setTimeout(() => {
        void loadGames()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [authenticated, activeFilter, loadGames])

  function handleFilterChange(filter: Filter) {
    setActiveFilter(filter)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setAuthenticated(false)
    setGames([])
    setPage(1)
    setHasMoreGames(false)
    setLoadMoreError('')
    setSelectedGameId(null)
    setShowSearch(false)
    setShowStatistics(false)
  }

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <span>🎮</span>
          <h1>GameVault AI</h1>
        </div>

        <div className="topbar-actions">
          <button className="search-button" onClick={() => setShowSearch(true)}>
            🔍 Buscar jogos
          </button>

          <div className="user-avatar">V</div>

          <button className="logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>
            <button
              className={`nav-item ${!showStatistics && !showSearch && selectedGameId === null ? 'active' : ''}`}
              onClick={() => {
                setShowStatistics(false)
                setShowSearch(false)
                setSelectedGameId(null)
              }}
            >
              🎮 Biblioteca
            </button>

            <button
              className={`nav-item ${showStatistics ? 'active' : ''}`}
              onClick={() => {
                setShowStatistics(true)
                setShowSearch(false)
                setSelectedGameId(null)
              }}
            >
              📊 Estatísticas
            </button>
          </nav>
        </aside>

        <main className="content">
          {selectedGameId !== null ? (
            <GameDetails
              gameId={selectedGameId}
              onClose={() => setSelectedGameId(null)}
              onUpdated={(updatedGame) => {
                setGames((currentGames) =>
                  currentGames
                    .map((game) =>
                      game.id === updatedGame.id
                        ? {
                            ...game,
                            platform: updatedGame.platform,
                            status: updatedGame.status,
                            game_type: updatedGame.game_type,
                            personal_rating: updatedGame.personal_rating,
                            hours_played: updatedGame.hours_played,
                            favorite: updatedGame.favorite,
                          }
                        : game,
                    )
                    .filter((game) =>
                      matchesActiveFilter(game, activeFilter),
                    ),
                )
              }}
              onDeleted={() => loadGames()}
            />
          ) : showStatistics ? (
            <Statistics onClose={() => setShowStatistics(false)} />
          ) : showSearch ? (
            <GameSearch
              onClose={() => setShowSearch(false)}
              onImported={() => loadGames()}
            />
          ) : (
            <>
              <section className="page-header">
                <div>
                  <h2>Minha biblioteca</h2>

                  <p>Gerencie seus jogos e acompanhe seu progresso.</p>
                </div>

                <button
                  className="add-game-button"
                  onClick={() => setShowSearch(true)}
                >
                  + Adicionar jogo
                </button>
              </section>

              <section className="library-summary">
                <span>
                  {hasMoreGames
                    ? `Mostrando ${games.length} jogos`
                    : `${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}`}
                </span>
              </section>

              <section className="filters">
                <button
                  className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('all')}
                >
                  Todos
                </button>

                <button
                  className={`filter ${activeFilter === 'backlog' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('backlog')}
                >
                  Backlog
                </button>

                <button
                  className={`filter ${activeFilter === 'playing' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('playing')}
                >
                  Jogando
                </button>

                <button
                  className={`filter ${
                    activeFilter === 'completed' ? 'active' : ''
                  }`}
                  onClick={() => handleFilterChange('completed')}
                >
                  Concluídos
                </button>

                <button
                  className={`filter ${
                    activeFilter === 'favorites' ? 'active' : ''
                  }`}
                  onClick={() => handleFilterChange('favorites')}
                >
                  Favoritos
                </button>
              </section>

              <div>
                <button
                  className="ai-recommendations-button"
                  onClick={handleRecommendations}
                  disabled={loadingRecommendations}
                >
                  {loadingRecommendations
                    ? '🤖 Analisando sua biblioteca...'
                    : '✨ Gerar recomendações'}
                </button>

                {loadingRecommendations && (
                  <p className="ai-recommendations-loading">
                    Considerando seus jogos, favoritos, avaliações e gêneros...
                  </p>
                )}

                {recommendations.length > 0 && (
                  <RecommendationList
                    recommendations={recommendations}
                    games={games}
                    onAddToLibrary={handleAddRecommendationToLibrary}
                  />
                )}
              </div>

              {actionMessage && (
                <div className="action-message">{actionMessage}</div>
              )}

              {loading && (
                <div className="library-message">
                  <p>Carregando sua biblioteca...</p>
                </div>
              )}

              {error && (
                <div className="library-message error">
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && games.length === 0 && (
                <div className="library-message">
                  <h3>Nenhum jogo encontrado</h3>
                  <p>Não há jogos correspondentes a este filtro.</p>
                </div>
              )}

              {!loading && !error && games.length > 0 && (
                <section className="games-grid">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      id={game.id}
                      title={game.title}
                      platform={game.platform}
                      status={game.status}
                      gameType={game.game_type}
                      rating={game.personal_rating}
                      favorite={game.favorite}
                      coverImage={game.cover_image}
                      onUpdated={handleGameUpdated}
                      onDetails={(gameId) => setSelectedGameId(gameId)}
                    />
                  ))}
                </section>
              )}

              {!loading && hasMoreGames && games.length > 0 && (
                <div className="load-more-games">
                  {loadMoreError && (
                    <p className="library-message error">{loadMoreError}</p>
                  )}
                  <button
                    className="load-more-button"
                    onClick={() =>
                      void loadGames(activeFilter, page + 1, true)
                    }
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Carregando...' : 'Carregar mais jogos'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
