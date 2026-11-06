import i18n from '../i18n'
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
  onAddToLibrary: (rawgId: number) => Promise<boolean>
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

      const added = await onAddToLibrary(rawgId)
      if (added) {
        setAddedGameIds((currentIds) => [...currentIds, rawgId])
      }
    } finally {
      setAddingGameId(null)
    }
  }

  if (recommendations.length === 0) {
    return (
      <div>
        <h2>{i18n.t("🤖 Recomendações")}</h2>
        <p>

          {i18n.t("Adicione alguns jogos à sua biblioteca para receber recomendações.")}
        </p>
      </div>
    )
  }

  return (
    <section className="recommendations">
      <div className="recommendations-header">
        <div>
          <h2>{i18n.t("🤖 Recomendações com IA")}</h2>
          <p>

            {i18n.t("Sugestões baseadas nos jogos da sua biblioteca, favoritos e avaliações.")}
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
                  alt={i18n.t('Capa de {{title}}', { title: recommendation.title })}
                  className="recommendation-cover"
                />
              )}

              <div className="recommendation-content">
                <h3>{recommendation.title}</h3>

                <p className="recommendation-genres">
                  {recommendation.genres.join(' • ')}
                </p>

                <span className="recommendation-reason-label">

                  {i18n.t("💡Por que recomendamos")}
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
                      ? i18n.t("Adicionando...")
                      : alreadyInLibrary ||
                          addedGameIds.includes(recommendation.rawg_id!)
                        ? i18n.t("✓ Já está na biblioteca")
                        : i18n.t("+ Adicionar à biblioteca")}
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
