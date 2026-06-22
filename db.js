const DB_NAME = 'LearnServiceWorker'
const DB_STORE = 'pending-requests'
const DB_VERSION = 1


export async function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, {
          keyPath: 'id',
          autoIncrement: true
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addToStore(data) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, 'readwrite')
    const store = transaction.objectStore(DB_STORE)
    const request = store.add(data)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllFromStore() {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, 'readonly')
    const store = transaction.objectStore(DB_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

