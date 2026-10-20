import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createGameSession,
  deleteGameSession,
  deleteGameSessionImage,
  getGameSessionImage,
  getGameSessions,
  updateGameSession,
  uploadGameSessionImages,
  type GameSession,
  type GameSessionImage,
} from '../services/api'
import {
  deleteLocalGameplayClipsForSession,
  saveLocalGameplayClip,
  type LocalGameplayClip,
} from '../services/localGameplayClipStore'
import GameplaySessionRecorder, {
  type GameplayRecordingDraft,
} from './GameplaySessionRecorder'
import LocalGameplayClips from './LocalGameplayClips'
import './GameSessions.css'

interface GameSessionsProps {
  gameId: number
  gameTitle: string
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

function GameSessions({ gameId, gameTitle, onHoursChanged }: GameSessionsProps) {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [duration, setDuration] = useState('60')
  const [playedAt, setPlayedAt] = useState(() =>
    toLocalDateTimeValue(new Date()),
  )
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [recordingFlowActive, setRecordingFlowActive] = useState(false)
  const [uploadingSessionId, setUploadingSessionId] = useState<number | null>(null)
  const [selectedImages, setSelectedImages] = useState<Record<number, File[]>>({})
  const [error, setError] = useState('')
  const pendingRecordingSessionsRef = useRef(
    new Map<string, { session: GameSession; notes: string }>(),
  )

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

  async function handleSaveRecordedSession(draft: GameplayRecordingDraft) {
    setBusy(true)
    setError('')

    try {
      let pending = pendingRecordingSessionsRef.current.get(draft.id)

      if (!pending) {
        const durationMinutes = Math.max(1, Math.round(draft.durationMs / 60000))
        const session = await createGameSession(gameId, {
          played_at: draft.recordedAt,
          duration_minutes: durationMinutes,
          notes: draft.notes || null,
        })

        pending = { session, notes: draft.notes }
        pendingRecordingSessionsRef.current.set(draft.id, pending)
        setSessions((current) => [session, ...current])
        onHoursChanged(durationMinutes / 60)
      } else if (pending.notes !== draft.notes) {
        const updatedSession = await updateGameSession(gameId, pending.session.id, {
          notes: draft.notes || null,
        })
        pending = { session: updatedSession, notes: draft.notes }
        pendingRecordingSessionsRef.current.set(draft.id, pending)
        setSessions((current) =>
          current.map((session) =>
            session.id === updatedSession.id ? updatedSession : session,
          ),
        )
      }

      const clip: LocalGameplayClip = {
        id: draft.id,
        gameId,
        sessionId: pending.session.id,
        recordedAt: draft.recordedAt,
        durationMs: draft.durationMs,
        blob: draft.blob,
      }

      try {
        await saveLocalGameplayClip(clip)
      } catch (saveError) {
        if (saveError instanceof DOMException && saveError.name === 'QuotaExceededError') {
          throw new Error(
            'A sessão foi registrada, mas o armazenamento local está cheio. Baixe a gravação e libere espaço para tentar salvá-la novamente.',
            { cause: saveError },
          )
        }
        throw new Error(
          'A sessão foi registrada, mas não foi possível salvar o clipe localmente. Você pode baixar uma cópia e tentar novamente.',
          { cause: saveError },
        )
      }

      pendingRecordingSessionsRef.current.delete(draft.id)
    } finally {
      setBusy(false)
    }
  }

  function handleDiscardRecording(recordingId: string) {
    pendingRecordingSessionsRef.current.delete(recordingId)
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
      await deleteLocalGameplayClipsForSession(gameId, session.id).catch(() => {})
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
        <div className="game-session-mode-intro">
          <strong>Registrar manualmente</strong>
          <p>Informe duração, horário e observações. Depois, você pode anexar prints à sessão.</p>
        </div>
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

        <div className="game-session-form-actions">
          <button
            className="game-session-submit"
            type="submit"
            disabled={busy || recordingFlowActive}
          >
            {busy ? 'Salvando...' : 'Registrar sessão'}
          </button>
        </div>

        <div className="game-session-mode-divider"><span>ou grave uma sessão</span></div>
        <GameplaySessionRecorder
          gameTitle={gameTitle}
          onSave={handleSaveRecordedSession}
          onDiscard={handleDiscardRecording}
          onFlowChange={setRecordingFlowActive}
        />
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
                  <LocalGameplayClips
                    gameId={gameId}
                    gameTitle={gameTitle}
                    sessionId={session.id}
                  />
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
                      <div className="game-session-image-picker">
                        <label htmlFor={`session-images-${session.id}`}>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 16 16"
                            focusable="false"
                          >
                            <path d="M8 3v10M3 8h10" />
                          </svg>
                          Adicionar prints
                        </label>
                        <input
                          id={`session-images-${session.id}`}
                          className="game-session-file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) => {
                            handleImageSelection(session, event.currentTarget.files)
                            event.currentTarget.value = ''
                          }}
                          disabled={uploadingSessionId === session.id}
                        />
                        <span className="game-session-file-hint">
                          {selectedImages[session.id]?.length
                            ? `${selectedImages[session.id].length} print(s) selecionado(s)`
                            : 'JPG, PNG ou WEBP · até 5 MB cada'}
                        </span>
                      </div>
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
