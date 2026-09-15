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

export async function getGames(status?: string, favorite?: boolean) {
  const params = new URLSearchParams()

  if (status) {
    params.append('status', status)
  }

  if (favorite !== undefined) {
    params.append('favorite', String(favorite))
  }

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

export async function importGame(rawgId: number) {
  const response = await fetch(`${API_URL}/games/import/${rawgId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    throw new Error('Sessão expirada.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível importar o jogo.')
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

export async function updateGame(
  gameId: number,
  data: {
    platform?: string
    status?: string
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
    throw new Error('Não foi possível atualizar o jogo.')
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
