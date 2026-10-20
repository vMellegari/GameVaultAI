import { useEffect, useState } from 'react'
import {
  deleteLocalGameplayClip,
  getLocalGameplayClips,
  type LocalGameplayClip,
} from '../services/localGameplayClipStore'
import './LocalGameplayClips.css'

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function LocalClipPlayer({ clip }: { clip: LocalGameplayClip }) {
  const [url] = useState(() => URL.createObjectURL(clip.blob))

  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return <video controls preload="metadata" src={url} />
}

function LocalGameplayClips({ gameId, gameTitle, sessionId }: {
  gameId: number
  gameTitle: string
  sessionId: number
}) {
  const [clips, setClips] = useState<LocalGameplayClip[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getLocalGameplayClips(gameId, sessionId)
      .then((loadedClips) => {
        if (active) {
          setClips(loadedClips)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível carregar os clipes locais.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [gameId, sessionId])

  async function removeClip(clip: LocalGameplayClip) {
    if (!window.confirm('Excluir este clipe salvo neste navegador?')) {
      return
    }

    try {
      await deleteLocalGameplayClip(clip.id)
      setClips((current) => current.filter((item) => item.id !== clip.id))
      setError('')
    } catch {
      setError('Não foi possível excluir o clipe local.')
    }
  }

  function downloadClip(clip: LocalGameplayClip) {
    const url = URL.createObjectURL(clip.blob)
    const anchor = document.createElement('a')
    const safeTitle = gameTitle.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '')
    anchor.href = url
    anchor.download = `${safeTitle || 'gameplay'}-${new Date(clip.recordedAt)
      .toISOString()
      .replace(/[:.]/g, '-')}.webm`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (clips.length === 0 && !error) {
    return null
  }

  return (
    <div className="local-gameplay-clips">
      {clips.length > 0 && (
        <>
          <div className="local-gameplay-heading">
            <div>
              <strong>Clipes de gameplay</strong>
              <p>Salvos somente neste navegador e neste dispositivo.</p>
            </div>
          </div>
          {error && <p className="local-gameplay-error" role="alert">{error}</p>}
          <ul className="local-gameplay-list">
            {clips.map((clip) => (
              <li key={clip.id}>
                <LocalClipPlayer clip={clip} />
                <div className="local-gameplay-clip-meta">
                  <span>
                    {new Date(clip.recordedAt).toLocaleString('pt-BR')} ·{' '}
                    {formatDuration(clip.durationMs)} · {formatFileSize(clip.blob.size)}
                  </span>
                  <div>
                    <button type="button" onClick={() => downloadClip(clip)}>
                      Baixar
                    </button>
                    <button type="button" onClick={() => void removeClip(clip)}>
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {clips.length === 0 && error && (
        <p className="local-gameplay-error" role="alert">{error}</p>
      )}
    </div>
  )
}

export default LocalGameplayClips
