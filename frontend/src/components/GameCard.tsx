interface GameCardProps {
  title: string
  platform: string
  status: string
  rating?: number
  favorite?: boolean
}

function GameCard({
  title,
  platform,
  status,
  rating,
  favorite = false,
}: GameCardProps) {
  return (
    <article className="game-card">
      <div className="game-cover">
        <span className="game-cover-placeholder">🎮</span>

        {favorite && <span className="favorite-badge">★</span>}
      </div>

      <div className="game-info">
        <h3>{title}</h3>

        <p className="game-platform">{platform}</p>

        <div className="game-meta">
          <span className="game-status">{status}</span>

          {rating !== undefined && (
            <span className="game-rating">★ {rating}/10</span>
          )}
        </div>
      </div>
    </article>
  )
}

export default GameCard
