import { useEffect, useRef, useState } from 'react'
import './GameplaySessionRecorder.css'

const MAX_RECORDING_MS = 15 * 60 * 1000

export interface GameplayRecordingDraft {
  id: string
  recordedAt: string
  durationMs: number
  blob: Blob
  notes: string
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function GameplaySessionRecorder({
  gameTitle,
  onSave,
  onDiscard,
  onFlowChange,
}: {
  gameTitle: string
  onSave: (draft: GameplayRecordingDraft) => Promise<void>
  onDiscard: (recordingId: string) => void
  onFlowChange: (active: boolean) => void
}) {
  const [starting, setStarting] = useState(false)
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [draft, setDraft] = useState<GameplayRecordingDraft | null>(null)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const stopTimerRef = useRef<number | null>(null)

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
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
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

    setStarting(true)
    onFlowChange(true)

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

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        })
        const draftRecording: GameplayRecordingDraft = {
          id: crypto.randomUUID(),
          recordedAt: new Date(startedAtRef.current).toISOString(),
          durationMs: Date.now() - startedAtRef.current,
          blob,
          notes: '',
        }

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
        setStarting(false)

        if (blob.size === 0) {
          setError('A gravação ficou vazia. Tente novamente.')
          onFlowChange(false)
          return
        }

        setDraft(draftRecording)
        setNotes('')
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', stopRecording, {
        once: true,
      })
      recorder.start(1000)
      setElapsedMs(0)
      setRecording(true)
      setStarting(false)
      stopTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS)
    } catch (captureError) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setStarting(false)
      onFlowChange(false)
      if (captureError instanceof DOMException && captureError.name === 'NotAllowedError') {
        setError('Captura cancelada. Autorize o compartilhamento da tela para gravar.')
      } else {
        setError('Não foi possível iniciar a captura de tela.')
      }
    }
  }

  async function saveRecording() {
    if (!draft) {
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({ ...draft, notes: notes.trim() })
      setDraft(null)
      onFlowChange(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar a sessão e o clipe.',
      )
    } finally {
      setSaving(false)
    }
  }

  function discardRecording() {
    if (draft) {
      onDiscard(draft.id)
    }
    setDraft(null)
    setError('')
    onFlowChange(false)
  }

  function downloadDraft() {
    if (!draft) {
      return
    }

    const url = URL.createObjectURL(draft.blob)
    const anchor = document.createElement('a')
    const safeTitle = gameTitle.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '')
    anchor.href = url
    anchor.download = `${safeTitle || 'gameplay'}-${new Date(draft.recordedAt)
      .toISOString()
      .replace(/[:.]/g, '-')}.webm`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="gameplay-recorder">
      <button
        type="button"
        className={recording ? 'gameplay-recorder-stop' : 'gameplay-recorder-start'}
        onClick={recording ? stopRecording : () => void startRecording()}
        disabled={starting || saving || (draft !== null && !recording)}
      >
        {recording
          ? `Parar e revisar sessão · ${formatDuration(elapsedMs)}`
          : starting
            ? 'Aguardando seleção da tela...'
            : 'Iniciar sessão com gravação'}
      </button>
      <span className="gameplay-recorder-hint">
        Selecione a janela do jogo. O tempo da gravação será usado na sessão (máx. 15 min).
      </span>
      {error && !draft && <p className="gameplay-recorder-error" role="alert">{error}</p>}

      {draft && (
        <div className="gameplay-review-backdrop">
          <section
            className="gameplay-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameplay-review-title"
          >
            <h3 id="gameplay-review-title">Revisar sessão gravada</h3>
            <p>
              Duração: <strong>{formatDuration(draft.durationMs)}</strong>. A gravação será salva
              localmente e a sessão ficará vinculada a este jogo. O tempo da sessão é arredondado
              para o minuto mais próximo, com mínimo de 1 minuto.
            </p>
            <label htmlFor="gameplay-session-notes">
              Observação para uma análise futura (opcional)
              <textarea
                id="gameplay-session-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Ex.: morri nesta parte porque avancei sem verificar os inimigos..."
                disabled={saving}
              />
            </label>
            {error && <p className="gameplay-recorder-error" role="alert">{error}</p>}
            <div className="gameplay-review-actions">
              <button type="button" onClick={downloadDraft} disabled={saving}>
                Baixar cópia
              </button>
              <button type="button" onClick={discardRecording} disabled={saving}>
                {error.startsWith('A sessão foi registrada')
                  ? 'Manter sessão sem clipe'
                  : 'Descartar gravação'}
              </button>
              <button
                type="button"
                className="gameplay-review-save"
                onClick={() => void saveRecording()}
                disabled={saving}
              >
                {saving ? 'Salvando sessão e clipe...' : 'Salvar sessão e clipe'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default GameplaySessionRecorder
