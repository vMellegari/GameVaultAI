import i18n from '../i18n'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getDiscordLoginUrl, login, register } from '../services/api'
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

            {i18n.t(isRegistering ? "Usuário" : "Usuário ou e-mail")}
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={i18n.t(isRegistering ? "Digite seu usuário" : "Digite seu usuário ou e-mail")}
              autoComplete="username"
              required
            />
          </label>

          {isRegistering && (
            <label>

              {i18n.t("E-mail")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              placeholder={i18n.t("voce@exemplo.com")}
              autoComplete="email"
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

        {!isRegistering && (
          <>
            <div className="login-divider"><span>{i18n.t("ou")}</span></div>
            <button
              type="button"
              className="discord-login-button"
              onClick={() => { window.location.href = getDiscordLoginUrl() }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="discord-logo">
                <path fill="currentColor" d="M19.73 5.2a18.2 18.2 0 0 0-4.52-1.4.07.07 0 0 0-.08.04c-.2.36-.42.83-.58 1.2a16.8 16.8 0 0 0-5.1 0c-.16-.38-.39-.84-.59-1.2a.08.08 0 0 0-.08-.04 18.1 18.1 0 0 0-4.52 1.4.07.07 0 0 0-.03.03C1.35 9.45.56 13.56.96 17.62a.09.09 0 0 0 .04.06 18.3 18.3 0 0 0 5.54 2.8.08.08 0 0 0 .09-.03c.43-.59.81-1.22 1.14-1.89a.08.08 0 0 0-.04-.1 12 12 0 0 1-1.73-.82.08.08 0 0 1-.01-.13l.35-.28a.08.08 0 0 1 .08-.01c3.63 1.66 7.56 1.66 11.15 0a.08.08 0 0 1 .08.01l.35.28a.08.08 0 0 1-.01.13c-.55.32-1.13.6-1.73.82a.08.08 0 0 0-.04.11c.33.66.71 1.29 1.14 1.88a.08.08 0 0 0 .09.03 18.2 18.2 0 0 0 5.55-2.8.08.08 0 0 0 .04-.06c.47-4.69-.8-8.76-3.39-12.39a.06.06 0 0 0-.03-.03ZM8.09 14.82c-1.09 0-1.99-1-1.99-2.23s.88-2.23 1.99-2.23c1.12 0 2.01 1.01 1.99 2.23 0 1.23-.88 2.23-1.99 2.23Zm7.36 0c-1.09 0-1.99-1-1.99-2.23s.88-2.23 1.99-2.23c1.12 0 2.01 1.01 1.99 2.23 0 1.23-.87 2.23-1.99 2.23Z" />
              </svg>
              {i18n.t("Continuar com Discord")}
            </button>
          </>
        )}

        {window.location.hash.includes('auth_error=discord_unavailable') && (
          <p className="login-error">{i18n.t("Login com Discord não configurado. Reinicie a API após conferir as variáveis do Discord no .env.")}</p>
        )}

        {window.location.hash.includes('auth_error=discord_failed') && (
          <p className="login-error">{i18n.t("Não foi possível entrar com o Discord. Tente novamente.")}</p>
        )}

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
