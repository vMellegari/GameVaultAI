import { useState } from 'react'

import './RecommendationList.css'

interface Recommendation {
  title: string
  genres: string[]
  reason: string
  rawg_id: number | null
  cover_image: string | null
}

interface Game {
  id: number
  title: string
  rawg_id: number | null
}

interface RecommendationListProps {
  recommendations: Recommendation[]
  games: Game[]
  onAddToLibrary: (rawgId: number) => Promise<void>
}

export default function RecommendationList({
  recommendations,
  games,
  onAddToLibrary,
}: RecommendationListProps) {
  const [addingGameId, setAddingGameId] = useState<number | null>(null)
  const [addedGameIds, setAddedGameIds] = useState<number[]>([])

  async function handleAddToLibrary(rawgId: number) {
    try {
      setAddingGameId(rawgId)

      await onAddToLibrary(rawgId)

      setAddedGameIds((currentIds) => [...currentIds, rawgId])
    } finally {
      setAddingGameId(null)
    }
  }

  if (recommendations.length === 0) {
    return (
      <div>
        <h2>🤖 Recomendações</h2>
        <p>
          Adicione alguns jogos à sua biblioteca para receber recomendações.
        </p>
      </div>
    )
  }

  return (
    <section className="recommendations">
      <div className="recommendations-header">
        <div>
          <h2>🤖 Recomendações com IA</h2>
          <p>
            Sugestões baseadas nos jogos da sua biblioteca, favoritos e
            avaliações.
          </p>
        </div>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((recommendation) => {
          const alreadyInLibrary = games.some(
            (game) => game.rawg_id === recommendation.rawg_id,
          )

          return (
            <article className="recommendation-card" key={recommendation.title}>
              {recommendation.cover_image && (
                <img
                  src={recommendation.cover_image}
                  alt={`Capa de ${recommendation.title}`}
                  className="recommendation-cover"
                />
              )}

              <div className="recommendation-content">
                <h3>{recommendation.title}</h3>

                <p className="recommendation-genres">
                  {recommendation.genres.join(' • ')}
                </p>

                <span className="recommendation-reason-label">
                  💡Por que recomendamos
                </span>
                <p className="recommendation-reason">{recommendation.reason}</p>
                {recommendation.rawg_id && (
                  <button
                    className="add-recommendation-button"
                    onClick={() => handleAddToLibrary(recommendation.rawg_id!)}
                    disabled={
                      addingGameId === recommendation.rawg_id ||
                      addedGameIds.includes(recommendation.rawg_id!) ||
                      alreadyInLibrary
                    }
                  >
                    {addingGameId === recommendation.rawg_id
                      ? 'Adicionando...'
                      : alreadyInLibrary ||
                          addedGameIds.includes(recommendation.rawg_id!)
                        ? '✓ Já está na biblioteca'
                        : '+ Adicionar à biblioteca'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
