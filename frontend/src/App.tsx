import { useCallback, useEffect, useState } from 'react'
import Login from './components/Login'
import GameCard from './components/GameCard'
import GameSearch from './components/GameSearch'
import GameDetails from './components/GameDetails'
import Statistics from './components/Statistics'
import { getGames } from './services/api'
import './App.css'

interface Game {
  id: number
  title: string
  platform: string
  status: string
  personal_rating: number | null
  hours_played: number
  favorite: boolean
  cover_image: string | null
}

type Filter = 'all' | 'backlog' | 'playing' | 'completed' | 'favorites'

function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('access_token')),
  )

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [showStatistics, setShowStatistics] = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  const loadGames = useCallback(
    async (filter: Filter = activeFilter) => {
      setLoading(true)
      setError('')

      try {
        let status: string | undefined
        let favorite: boolean | undefined

        if (filter === 'backlog') {
          status = 'backlog'
        }

        if (filter === 'playing') {
          status = 'playing'
        }

        if (filter === 'completed') {
          status = 'completed'
        }

        if (filter === 'favorites') {
          favorite = true
        }

        const data = await getGames(status, favorite)

        setGames(data)
      } catch (err) {
        if (err instanceof Error && err.message === 'Sessão expirada.') {
          setAuthenticated(false)
          return
        }

        setError('Não foi possível carregar sua biblioteca.')
      } finally {
        setLoading(false)
      }
    },
    [activeFilter],
  )

  function handleGameUpdated(message: string) {
    setActionMessage(message)

    loadGames()

    setTimeout(() => {
      setActionMessage('')
    }, 2500)
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
    setSelectedGameId(null)
    setShowSearch(false)
    setShowStatistics(false)
  }

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />
  }

  if (selectedGameId !== null) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="logo">
            <span>🎮</span>
            <h1>GameVault AI</h1>
          </div>

          <div className="topbar-actions">
            <div className="user-avatar">V</div>
          </div>
        </header>

        <main className="content details-content">
          <GameDetails
            gameId={selectedGameId}
            onClose={() => setSelectedGameId(null)}
            onDeleted={() => loadGames()}
          />
        </main>
      </div>
    )
  }

  if (showStatistics) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="logo">
            <span>🎮</span>
            <h1>GameVault AI</h1>
          </div>

          <div className="topbar-actions">
            <div className="user-avatar">V</div>
          </div>
        </header>

        <main className="content details-content">
          <Statistics onClose={() => setShowStatistics(false)} />
        </main>
      </div>
    )
  }

  if (showSearch) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="logo">
            <span>🎮</span>
            <h1>GameVault AI</h1>
          </div>

          <div className="topbar-actions">
            <div className="user-avatar">V</div>
          </div>
        </header>

        <main className="content search-content">
          <GameSearch
            onClose={() => setShowSearch(false)}
            onImported={() => loadGames()}
          />
        </main>
      </div>
    )
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
            <button className="nav-item active">🎮 Biblioteca</button>

            <button className="nav-item">⭐ Favoritos</button>

            <button
              className="nav-item"
              onClick={() => setShowStatistics(true)}
            >
              📊 Estatísticas
            </button>
          </nav>
        </aside>

        <main className="content">
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
              {games.length} {games.length === 1 ? 'jogo' : 'jogos'}
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
                  rating={game.personal_rating}
                  favorite={game.favorite}
                  coverImage={game.cover_image}
                  onUpdated={handleGameUpdated}
                  onDetails={(gameId) => setSelectedGameId(gameId)}
                />
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
