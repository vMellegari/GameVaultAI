import { useState } from 'react'
import Login from './components/Login'
import GameCard from './components/GameCard'
import './App.css'

function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('access_token')),
  )

  const games = [
    {
      title: 'The Witcher 3',
      platform: 'PC',
      status: 'Jogando',
      rating: 9.5,
      favorite: true,
    },
    {
      title: 'Elden Ring',
      platform: 'PC',
      status: 'Backlog',
      rating: 9,
      favorite: true,
    },
    {
      title: 'Cyberpunk 2077',
      platform: 'PC',
      status: 'Backlog',
      rating: 8.5,
      favorite: false,
    },
    {
      title: 'Baldur’s Gate 3',
      platform: 'PC',
      status: 'Concluído',
      rating: 10,
      favorite: true,
    },
  ]

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
          <button className="search-button">🔍 Buscar jogos</button>

          <div className="user-avatar">V</div>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>
            <button className="nav-item active">🎮 Biblioteca</button>

            <button className="nav-item">⭐ Favoritos</button>

            <button className="nav-item">📊 Estatísticas</button>
          </nav>
        </aside>

        <main className="content">
          <section className="page-header">
            <div>
              <h2>Minha biblioteca</h2>
              <p>Gerencie seus jogos e acompanhe seu progresso.</p>
            </div>

            <button className="add-game-button">+ Adicionar jogo</button>
          </section>

          <section className="filters">
            <button className="filter active">Todos</button>

            <button className="filter">Backlog</button>

            <button className="filter">Jogando</button>

            <button className="filter">Concluídos</button>

            <button className="filter">Favoritos</button>
          </section>

          <section className="games-grid">
            {games.map((game) => (
              <GameCard
                key={game.title}
                title={game.title}
                platform={game.platform}
                status={game.status}
                rating={game.rating}
                favorite={game.favorite}
              />
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
