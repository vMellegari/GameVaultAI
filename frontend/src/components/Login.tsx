import { useState } from 'react'
import type { FormEvent } from 'react'
import { login, register } from '../services/api'
import './Login.css'

interface LoginProps {
  onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        await register(username, email, password)
      }

      const data = await login(username, password)

      localStorage.setItem('access_token', data.access_token)

      onLogin()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível concluir a operação.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">🎮</div>

        <h1>GameVault AI</h1>

        <p>
          {isRegistering
            ? 'Crie sua conta para começar sua biblioteca.'
            : 'Entre na sua conta para acessar sua biblioteca.'}
        </p>

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

          {isRegistering && (
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
              />
            </label>
          )}

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegistering ? 'Crie uma senha' : 'Digite sua senha'}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading
              ? isRegistering
                ? 'Criando conta...'
                : 'Entrando...'
              : isRegistering
                ? 'Criar conta'
                : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          className="auth-mode-button"
          onClick={() => {
            setIsRegistering((current) => !current)
            setError('')
          }}
          disabled={loading}
        >
          {isRegistering
            ? 'Já tem uma conta? Entrar'
            : 'Ainda não tem uma conta? Cadastre-se'}
        </button>
      </div>
    </main>
  )
}

export default Login
