import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteLocalGameplayClip,
  getLocalGameplayClips,
  saveLocalGameplayClip,
  type LocalGameplayClip,
} from '../services/localGameplayClipStore'
import './LocalGameplayClips.css'

const MAX_RECORDING_MS = 15 * 60 * 1000

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
  const [url, setUrl] = useState('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(clip.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [clip.blob])

  return url ? <video controls preload="metadata" src={url} /> : null
}

function LocalGameplayClips({
  gameId,
  gameTitle,
  sessionId,
}: {
  gameId: number
  gameTitle: string
  sessionId: number
}) {
  const [clips, setClips] = useState<LocalGameplayClip[]>([])
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const stopTimerRef = useRef<number | null>(null)

  const refreshClips = useCallback(async () => {
    try {
      setClips(await getLocalGameplayClips(gameId, sessionId))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar os clipes locais.',
      )
    }
  }, [gameId, sessionId])

  useEffect(() => {
    void refreshClips()
  }, [refreshClips])

  useEffect(() => {
    if (!recording) {
      return
    }

    const intervalId = window.setInterval(
      () => setElapsedMs(Date.now() - startedAtRef.current),
      1000,
    )
    return () => window.clearInterval(intervalId)
  }, [recording])

  useEffect(
    () => () => {
      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current)
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  async function startRecording() {
    setError('')

    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
      setError('A gravação de tela não é compatível com este navegador.')
      return
    }

    if (!window.isSecureContext) {
      setError('A gravação precisa ser aberta em uma conexão segura (HTTPS ou localhost).')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      })
      streamRef.current = stream
      chunksRef.current = []
      startedAtRef.current = Date.now()

      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onerror = () => {
        setError('O navegador encontrou um erro durante a gravação.')
        stopRecording()
      }
      recorder.onstop = () => {
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current)
          stopTimerRef.current = null
        }
        const durationMs = Date.now() - startedAtRef.current
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
        setSaving(true)

        void (async () => {
          try {
            if (blob.size === 0) {
              throw new Error('A gravação ficou vazia. Tente novamente.')
            }
            const clip: LocalGameplayClip = {
              id: crypto.randomUUID(),
              gameId,
              sessionId,
              recordedAt: new Date(startedAtRef.current).toISOString(),
              durationMs,
              blob,
            }
            await saveLocalGameplayClip(clip)
            await refreshClips()
          } catch (saveError) {
            setError(
              saveError instanceof DOMException && saveError.name === 'QuotaExceededError'
                ? 'O armazenamento local do navegador está cheio. Exporte ou exclua clipes antigos e tente novamente.'
                : saveError instanceof Error
                  ? saveError.message
                  : 'Não foi possível salvar o clipe localmente.',
            )
          } finally {
            setSaving(false)
          }
        })()
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', stopRecording, {
        once: true,
      })
      recorder.start(1000)
      setElapsedMs(0)
      setRecording(true)
      stopTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS)
    } catch (captureError) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (captureError instanceof DOMException && captureError.name === 'NotAllowedError') {
        setError('Captura cancelada. Autorize o compartilhamento da tela para gravar.')
      } else {
        setError('Não foi possível iniciar a captura de tela.')
      }
    }
  }

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

  return (
    <div className="local-gameplay-clips">
      <div className="local-gameplay-heading">
        <div>
          <strong>Clipes de gameplay</strong>
          <p>Salvos somente neste navegador e neste dispositivo.</p>
        </div>
        <button
          type="button"
          className={recording ? 'local-gameplay-stop' : 'local-gameplay-start'}
          onClick={recording ? stopRecording : () => void startRecording()}
          disabled={saving}
        >
          {recording
            ? `Parar gravação · ${formatDuration(elapsedMs)}`
            : saving
              ? 'Salvando clipe...'
              : 'Gravar tela'}
        </button>
      </div>

      <p className="local-gameplay-note">
        O navegador pedirá para escolher uma tela ou janela. Até 15 minutos por clipe;
        o áudio depende do suporte do navegador e da opção escolhida no compartilhamento.
      </p>

      {error && <p className="local-gameplay-error" role="alert">{error}</p>}
      {clips.length > 0 && (
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
      )}
    </div>
  )
}

export default LocalGameplayClips
