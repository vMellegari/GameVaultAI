import { useState } from 'react'

import './RecommendationList.css'

interface Recommendation {
  title: string
  genres: string[]
  reason: string
  rawg_id: number | null
  cover_image: string | null
}

interface RecommendationListProps {
  recommendations: Recommendation[]
  onAddToLibrary: (rawgId: number) => Promise<void>
}

export default function RecommendationList({
  recommendations,
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
      <h2>🤖 Recomendações para você</h2>

      <div className="recommendations-grid">
        {recommendations.map((recommendation) => (
          <article className="recommendation-card" key={recommendation.title}>
            {recommendation.cover_image && (
              <img
                src={recommendation.cover_image}
                alt={`Capa de ${recommendation.title}`}
                className="recommendation-cover"
              />
            )}

            <h3>{recommendation.title}</h3>

            <p className="recommendation-genres">
              {recommendation.genres.join(' • ')}
            </p>

            <p className="recommendation-reason">{recommendation.reason}</p>
            {recommendation.rawg_id && (
              <button
                onClick={() => handleAddToLibrary(recommendation.rawg_id!)}
                disabled={
                  addingGameId === recommendation.rawg_id ||
                  addedGameIds.includes(recommendation.rawg_id!)
                }
              >
                {addingGameId === recommendation.rawg_id
                  ? 'Adicionando...'
                  : addedGameIds.includes(recommendation.rawg_id!)
                    ? '✓ Já está na biblioteca'
                    : '+ Adicionar à biblioteca'}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
