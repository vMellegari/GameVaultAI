import { useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../services/api'

interface LoginProps {
  onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const data = await login(username, password)

      localStorage.setItem('access_token', data.access_token)

      onLogin()
    } catch {
      setError('Usuário ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">🎮</div>

        <h1>GameVault AI</h1>

        <p>Entre na sua conta para acessar sua biblioteca.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Usuário
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
