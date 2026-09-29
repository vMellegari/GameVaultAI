import { useEffect, useState, type FormEvent } from 'react'
import {
  createGameSession,
  deleteGameSession,
  deleteGameSessionImage,
  getGameSessionImage,
  getGameSessions,
  uploadGameSessionImages,
  type GameSession,
  type GameSessionImage,
} from '../services/api'
import './GameSessions.css'

interface GameSessionsProps {
  gameId: number
  onHoursChanged: (changeInHours: number) => void
}

function toLocalDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${remainingMinutes} min`
  }

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes} min`
    : `${hours}h`
}

function SessionImagePreview({
  gameId,
  sessionId,
  image,
  onDelete,
  disabled,
}: {
  gameId: number
  sessionId: number
  image: GameSessionImage
  onDelete: (image: GameSessionImage) => void
  disabled: boolean
}) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let active = true

    void getGameSessionImage(gameId, sessionId, image.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) {
          setImageUrl(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => {
        if (active) {
          setImageUrl('')
        }
      })

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [gameId, sessionId, image.id])

  return (
    <figure className="game-session-image">
      {imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer">
          <img src={imageUrl} alt={image.original_filename} loading="lazy" />
        </a>
      ) : (
        <span className="game-session-image-loading">Carregando imagem...</span>
      )}
      <figcaption>
        <span title={image.original_filename}>{image.original_filename}</span>
        <button
          type="button"
          onClick={() => onDelete(image)}
          disabled={disabled}
          aria-label={`Excluir ${image.original_filename}`}
        >
          Excluir
        </button>
      </figcaption>
    </figure>
  )
}

function GameSessions({ gameId, onHoursChanged }: GameSessionsProps) {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [duration, setDuration] = useState('60')
  const [playedAt, setPlayedAt] = useState(() =>
    toLocalDateTimeValue(new Date()),
  )
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploadingSessionId, setUploadingSessionId] = useState<number | null>(null)
  const [selectedImages, setSelectedImages] = useState<Record<number, File[]>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadSessions() {
      setLoading(true)
      setError('')

      try {
        const data = await getGameSessions(gameId)
        if (isCurrent) {
          setSessions(data)
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível carregar o histórico de sessões.',
          )
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
      }
    }

    void loadSessions()

    return () => {
      isCurrent = false
    }
  }, [gameId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const durationMinutes = Number(duration)
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 1440
    ) {
      setError('A duração deve estar entre 1 minuto e 24 horas.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const session = await createGameSession(gameId, {
        played_at: new Date(playedAt).toISOString(),
        duration_minutes: durationMinutes,
        notes: notes.trim() || null,
      })

      setSessions((current) => [session, ...current])
      setNotes('')
      onHoursChanged(durationMinutes / 60)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível registrar a sessão.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(session: GameSession) {
    const confirmed = window.confirm(
      'Excluir esta sessão? As horas registradas serão removidas do total do jogo.',
    )
    if (!confirmed) {
      return
    }

    setBusy(true)
    setError('')

    try {
      await deleteGameSession(gameId, session.id)
      setSessions((current) =>
        current.filter((currentSession) => currentSession.id !== session.id),
      )
      onHoursChanged(-session.duration_minutes / 60)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir a sessão.',
      )
    } finally {
      setBusy(false)
    }
  }

  function handleImageSelection(session: GameSession, files: FileList | null) {
    const selected = Array.from(files ?? [])
    if (selected.length + session.images.length > 5) {
      setError('Cada sessão pode ter no máximo 5 imagens.')
      return
    }
    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
      setError('Cada imagem deve ter no máximo 5 MB.')
      return
    }

    setError('')
    setSelectedImages((current) => ({ ...current, [session.id]: selected }))
  }

  async function handleUploadImages(sessionId: number) {
    const files = selectedImages[sessionId] ?? []
    if (files.length === 0) {
      setError('Selecione pelo menos uma imagem para anexar.')
      return
    }

    setUploadingSessionId(sessionId)
    setError('')
    try {
      const uploadedImages = await uploadGameSessionImages(
        gameId,
        sessionId,
        files,
      )
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? { ...session, images: [...session.images, ...uploadedImages] }
            : session,
        ),
      )
      setSelectedImages((current) => ({ ...current, [sessionId]: [] }))
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Não foi possível anexar as imagens.',
      )
    } finally {
      setUploadingSessionId(null)
    }
  }

  async function handleDeleteImage(sessionId: number, image: GameSessionImage) {
    if (!window.confirm(`Excluir a imagem “${image.original_filename}”?`)) {
      return
    }

    setUploadingSessionId(sessionId)
    setError('')
    try {
      await deleteGameSessionImage(gameId, sessionId, image.id)
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                images: session.images.filter((item) => item.id !== image.id),
              }
            : session,
        ),
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir a imagem.',
      )
    } finally {
      setUploadingSessionId(null)
    }
  }

  return (
    <section className="game-sessions">
      <div className="game-sessions-header">
        <div>
          <h3>Histórico de sessões</h3>
          <p>Registre suas partidas e acompanhe o tempo jogado.</p>
        </div>
        <span>
          {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
        </span>
      </div>

      {error && <p className="game-sessions-error">{error}</p>}

      <form className="game-session-form" onSubmit={handleSubmit}>
        <div className="game-session-fields">
          <label>
            Duração (minutos)
            <input
              type="number"
              min="1"
              max="1440"
              step="1"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
          </label>

          <label>
            Data e horário
            <input
              type="datetime-local"
              value={playedAt}
              onChange={(event) => setPlayedAt(event.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Observações (opcional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Como foi essa sessão?"
          />
        </label>

        <button className="game-session-submit" type="submit" disabled={busy}>
          {busy ? 'Salvando...' : 'Registrar sessão'}
        </button>
      </form>

      <div className="game-session-history">
        {loading ? (
          <p>Carregando sessões...</p>
        ) : sessions.length === 0 ? (
          <p>Nenhuma sessão registrada ainda.</p>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li className="game-session-item" key={session.id}>
                <div>
                  <div className="game-session-meta">
                    <time dateTime={session.played_at}>
                      {new Date(session.played_at).toLocaleString('pt-BR')}
                    </time>
                    <strong>{formatDuration(session.duration_minutes)}</strong>
                  </div>
                  {session.notes && <p>{session.notes}</p>}
                  {session.images.length > 0 && (
                    <div className="game-session-images">
                      {session.images.map((image) => (
                        <SessionImagePreview
                          key={image.id}
                          gameId={gameId}
                          sessionId={session.id}
                          image={image}
                          onDelete={(selectedImage) =>
                            void handleDeleteImage(session.id, selectedImage)
                          }
                          disabled={uploadingSessionId === session.id}
                        />
                      ))}
                    </div>
                  )}
                  {session.images.length < 5 && (
                    <div className="game-session-image-upload">
                      <label>
                        Anexar prints
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) =>
                            handleImageSelection(session, event.target.files)
                          }
                          disabled={uploadingSessionId === session.id}
                        />
                      </label>
                      {(selectedImages[session.id]?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleUploadImages(session.id)}
                          disabled={uploadingSessionId === session.id}
                        >
                          {uploadingSessionId === session.id
                            ? 'Enviando...'
                            : `Enviar ${selectedImages[session.id]?.length ?? 0} imagem(ns)`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="game-session-delete"
                  onClick={() => void handleDelete(session)}
                  disabled={busy}
                  aria-label="Excluir sessão"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default GameSessions
