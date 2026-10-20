export interface LocalGameplayClip {
  id: string
  gameId: number
  sessionId: number
  recordedAt: string
  durationMs: number
  blob: Blob
}

const DATABASE_NAME = 'gamevault-local-media'
const DATABASE_VERSION = 1
const STORE_NAME = 'gameplay-clips'

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(
      new Error('Este navegador não oferece armazenamento local de vídeos.'),
    )
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('sessionId', 'sessionId')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Não foi possível abrir o armazenamento local.'))
  })
}

export async function getLocalGameplayClips(
  gameId: number,
  sessionId: number,
): Promise<LocalGameplayClip[]> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).index('sessionId').getAll(sessionId)

    request.onsuccess = () => {
      resolve(
        (request.result as LocalGameplayClip[])
          .filter((clip) => clip.gameId === gameId)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
      )
    }
    request.onerror = () =>
      reject(request.error ?? new Error('Não foi possível carregar os clipes locais.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
}

export async function saveLocalGameplayClip(
  clip: LocalGameplayClip,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(clip)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Não foi possível salvar o clipe localmente.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('O navegador não tinha espaço para salvar o clipe.'))
    }
  })
}

export async function deleteLocalGameplayClip(id: string): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Não foi possível excluir o clipe local.'))
    }
  })
}

async function deleteLocalGameplayClips(
  predicate: (clip: LocalGameplayClip) => boolean,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      for (const clip of request.result as LocalGameplayClip[]) {
        if (predicate(clip)) {
          store.delete(clip.id)
        }
      }
    }
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Não foi possível limpar os clipes locais.'))
    }
  })
}

export function deleteLocalGameplayClipsForSession(
  gameId: number,
  sessionId: number,
): Promise<void> {
  return deleteLocalGameplayClips(
    (clip) => clip.gameId === gameId && clip.sessionId === sessionId,
  )
}

export function deleteLocalGameplayClipsForGame(gameId: number): Promise<void> {
  return deleteLocalGameplayClips((clip) => clip.gameId === gameId)
}
