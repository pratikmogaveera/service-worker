// IndexedDB helpers — Promise wrappers around the event-based IDB API.
// Used by both the page and service worker (shared database).

const DB_NAME = 'LearnServiceWorker'
const DB_STORE = 'pending-requests'
const DB_VERSION = 1


// Open (or create) the database. Object store is created in onupgradeneeded
// which only fires on first open or version bump.
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

// Insert a record into the pending-requests store. ID is auto-generated.
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

// Retrieve all pending requests for replay during sync.
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

// Remove a record by ID after successful replay.
export async function deleteFromStore(id) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, 'readwrite')
    const store = transaction.objectStore(DB_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

