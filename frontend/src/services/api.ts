const API_URL = 'http://localhost:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')

  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  if (!response.ok) {
    throw new Error('Usuário ou senha inválidos.')
  }

  return response.json()
}

export async function getGames(
  status?: string,
  favorite?: boolean,
  page = 1,
  limit = 10,
  gameType?: 'STANDARD' | 'ONGOING',
  title?: string,
) {
  const params = new URLSearchParams()

  if (status) {
    params.append('status', status)
  }

  if (favorite !== undefined) {
    params.append('favorite', String(favorite))
  }

  if (gameType) {
    params.append('game_type', gameType)
  }

  if (title) {
    params.append('title', title)
  }

  params.append('page', String(page))
  params.append('limit', String(limit))
  params.append('sort_by', 'title')

  const queryString = params.toString()

  const url = queryString
    ? `${API_URL}/games?${queryString}`
    : `${API_URL}/games`

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar os jogos.')
  }

  return response.json()
}

export async function searchGames(query: string) {
  const response = await fetch(
    `${API_URL}/games/search?query=${encodeURIComponent(query)}`,
  )

  if (!response.ok) {
    throw new Error('Não foi possível realizar a busca.')
  }

  return response.json()
}

export async function importGame(
  rawgId: number,
  gameType: 'STANDARD' | 'ONGOING' = 'STANDARD',
) {
  const response = await fetch(
    `${API_URL}/games/import/${rawgId}?game_type=${gameType}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  )

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.detail || 'Não foi possível importar o jogo.')
  }

  return response.json()
}

export async function startGame(gameId: number) {
  const response = await fetch(`${API_URL}/games/${gameId}/start`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível iniciar o jogo.')
  }

  return response.json()
}

export async function completeGame(gameId: number) {
  const response = await fetch(`${API_URL}/games/${gameId}/complete`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível concluir o jogo.')
  }

  return response.json()
}

export async function toggleFavorite(gameId: number) {
  const response = await fetch(`${API_URL}/games/${gameId}/toggle-favorite`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível alterar o favorito.')
  }

  return response.json()
}

export async function getGame(gameId: number) {
  const response = await fetch(`${API_URL}/games/${gameId}`, {
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar o jogo.')
  }

  return response.json()
}

export interface GameSession {
  id: number
  game_id: number
  played_at: string
  duration_minutes: number
  notes: string | null
  created_at: string
  images: GameSessionImage[]
}

export interface GameSessionImage {
  id: number
  session_id: number
  original_filename: string
  content_type: string
  file_size: number
  created_at: string
}

export async function getGameSessions(gameId: number): Promise<GameSession[]> {
  const response = await fetch(`${API_URL}/games/${gameId}/sessions`, {
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar o histórico de sessões.')
  }

  return response.json()
}

export async function createGameSession(
  gameId: number,
  data: {
    played_at: string
    duration_minutes: number
    notes: string | null
  },
): Promise<GameSession> {
  const response = await fetch(`${API_URL}/games/${gameId}/sessions`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível registrar a sessão.',
    )
  }

  return response.json()
}

export async function deleteGameSession(
  gameId: number,
  sessionId: number,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/games/${gameId}/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  )

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível excluir a sessão.',
    )
  }
}

export async function uploadGameSessionImages(
  gameId: number,
  sessionId: number,
  files: File[],
): Promise<GameSessionImage[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await fetch(
    `${API_URL}/games/${gameId}/sessions/${sessionId}/images`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    },
  )

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível anexar as imagens.',
    )
  }

  return response.json()
}

export async function getGameSessionImage(
  gameId: number,
  sessionId: number,
  imageId: number,
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/games/${gameId}/sessions/${sessionId}/images/${imageId}`,
    { headers: getAuthHeaders() },
  )

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar a imagem.')
  }

  return response.blob()
}

export async function deleteGameSessionImage(
  gameId: number,
  sessionId: number,
  imageId: number,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/games/${gameId}/sessions/${sessionId}/images/${imageId}`,
    { method: 'DELETE', headers: getAuthHeaders() },
  )

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível excluir a imagem.',
    )
  }
}

export async function updateGame(
  gameId: number,
  data: {
    platform?: string
    status?: string
    game_type?: 'STANDARD' | 'ONGOING'
    personal_rating?: number | null
    hours_played?: number
    notes?: string | null
    favorite?: boolean
  },
) {
  const response = await fetch(`${API_URL}/games/${gameId}`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message =
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível atualizar o jogo.'
    throw new Error(message)
  }

  return response.json()
}

export async function getGameStats() {
  const response = await fetch(`${API_URL}/games/stats`, {
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar as estatísticas.')
  }

  return response.json()
}

export async function getRecommendations() {
  const response = await fetch(`${API_URL}/games/recommendations`, {
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : 'Não foi possível carregar as recomendações.',
    )
  }

  return response.json()
}

export async function deleteGame(gameId: number) {
  const response = await fetch(`${API_URL}/games/${gameId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível excluir o jogo.')
  }
}
