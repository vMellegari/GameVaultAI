import i18n from '../i18n'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { login, register } from '../services/api'
import LanguageSwitcher from './LanguageSwitcher'
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

        <h1>{i18n.t("GameVault AI")}</h1>

        <p>
          {isRegistering
            ? i18n.t("Crie sua conta para começar sua biblioteca.")
            : i18n.t("Entre na sua conta para acessar sua biblioteca.")}
        </p>

        <form onSubmit={handleSubmit}>
          <label>

            {i18n.t("Usuário")}
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={i18n.t("Digite seu usuário")}              required
            />
          </label>

          {isRegistering && (
            <label>

              {i18n.t("E-mail")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={i18n.t("voce@exemplo.com")}                autoComplete="email"
                required
              />
            </label>
          )}

          <label>

            {i18n.t("Senha")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegistering ? i18n.t("Crie uma senha") : i18n.t("Digite sua senha")}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {error && <p className="login-error">{i18n.t(error)}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading
              ? isRegistering
                ? i18n.t("Criando conta...")
                : i18n.t("Entrando...")
              : isRegistering
                ? i18n.t("Criar conta")
                : i18n.t("Entrar")}
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
            ? i18n.t("Já tem uma conta? Entrar")
            : i18n.t("Ainda não tem uma conta? Cadastre-se")}
        </button>

        <div className="login-language"><LanguageSwitcher /></div>
      </div>
    </main>
  )
}

export default Login
