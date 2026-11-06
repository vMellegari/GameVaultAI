import i18n, { formatDate } from '../i18n'
import { useState, type FormEvent } from 'react'
import { importGame, searchGames } from '../services/api'
import './GameSearch.css'

type GameType = 'STANDARD' | 'ONGOING'

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
  const [gameTypes, setGameTypes] = useState<Record<number, GameType>>({})
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
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Não foi possível realizar a busca.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(rawgId: number) {
    setImportingId(rawgId)
    setError('')

    try {
      await importGame(rawgId, gameTypes[rawgId] ?? 'STANDARD')

      onClose()
      onImported()
    } catch (err) {
      if (err instanceof Error && err.message === 'Sessão expirada.') {
        setError('Sua sessão expirou. Faça login novamente.')
      } else if (err instanceof Error) {
        setError(err.message)
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
          <h2>{i18n.t("Adicionar jogo")}</h2>

          <p>{i18n.t("Busque um jogo na RAWG para adicionar à sua biblioteca.")}</p>
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
          placeholder={i18n.t("Ex: The Witcher 3")}
        />

        <button type="submit" disabled={loading}>
          {loading ? i18n.t("Buscando...") : i18n.t('Buscar')}
        </button>
      </form>

      {error && <p className="search-error">{i18n.t(error)}</p>}

      {!loading && results.length === 0 && !error && (
        <div className="search-empty">
          <span>🔎</span>

          <h3>{i18n.t("Encontre seu próximo jogo")}</h3>

          <p>{i18n.t("Digite o nome de um jogo para começar.")}</p>
        </div>
      )}

      <div className="search-results">
        {results.map((game) => (
          <article className="search-result" key={game.rawg_id}>
            <div className="search-result-cover">
              {game.cover_image ? (
                <img src={game.cover_image} alt={i18n.t('Capa de {{title}}', { title: game.title })} />
              ) : (
                <span>🎮</span>
              )}
            </div>

            <div className="search-result-info">
              <h3>{game.title}</h3>

              {game.released && <p>{i18n.t("Lançamento:")} {formatDate(game.released)}</p>}
            </div>

            <div className="search-result-actions">
              <label className="game-type-label">

                {i18n.t("Tipo")}
                <select
                  value={gameTypes[game.rawg_id] ?? 'STANDARD'}
                  onChange={(event) =>
                    setGameTypes((current) => ({
                      ...current,
                      [game.rawg_id]: event.target.value as GameType,
                    }))
                  }
                  disabled={importingId === game.rawg_id}
                >
                  <option value="STANDARD">{i18n.t("Tradicional")}</option>
                  <option value="ONGOING">{i18n.t("Contínua")}</option>
                </select>
              </label>
              <button
                className="import-button"
                onClick={() => handleImport(game.rawg_id)}
                disabled={importingId === game.rawg_id}
              >
                {importingId === game.rawg_id ? i18n.t("Adicionando...") : i18n.t("Adicionar")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default GameSearch
