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
}

export default function RecommendationList({
  recommendations,
}: RecommendationListProps) {
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
          </article>
        ))}
      </div>
    </section>
  )
}
