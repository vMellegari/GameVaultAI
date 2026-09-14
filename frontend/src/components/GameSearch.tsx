import { useState, type FormEvent } from 'react'
import { importGame, searchGames } from '../services/api'

interface SearchResult {
  rawg_id: number
  title: string
  cover_image: string | null
  released: string | null
}

interface GameSearchProps {
  onClose: () => void
  onImported: () => void
}

function GameSearch({ onClose, onImported }: GameSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleSearch(event: FormEvent) {
    event.preventDefault()

    if (query.trim().length < 2) {
      setError('Digite pelo menos 2 caracteres para realizar a busca.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await searchGames(query.trim())
      setResults(data)
    } catch {
      setError('Não foi possível realizar a busca.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(rawgId: number) {
    setImportingId(rawgId)
    setError('')

    try {
      await importGame(rawgId)

      onClose()
      onImported()
    } catch (err) {
      if (err instanceof Error && err.message === 'Sessão expirada.') {
        setError('Sua sessão expirou. Faça login novamente.')
      } else {
        setError('Não foi possível importar o jogo.')
      }
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <div>
          <h2>Adicionar jogo</h2>

          <p>Busque um jogo na RAWG para adicionar à sua biblioteca.</p>
        </div>

        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <form className="game-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex: The Witcher 3"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p className="search-error">{error}</p>}

      {!loading && results.length === 0 && !error && (
        <div className="search-empty">
          <span>🔎</span>

          <h3>Encontre seu próximo jogo</h3>

          <p>Digite o nome de um jogo para começar.</p>
        </div>
      )}

      <div className="search-results">
        {results.map((game) => (
          <article className="search-result" key={game.rawg_id}>
            <div className="search-result-cover">
              {game.cover_image ? (
                <img src={game.cover_image} alt={`Capa de ${game.title}`} />
              ) : (
                <span>🎮</span>
              )}
            </div>

            <div className="search-result-info">
              <h3>{game.title}</h3>

              {game.released && <p>Lançamento: {game.released}</p>}
            </div>

            <button
              className="import-button"
              onClick={() => handleImport(game.rawg_id)}
              disabled={importingId === game.rawg_id}
            >
              {importingId === game.rawg_id ? 'Adicionando...' : 'Adicionar'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export default GameSearch
