
export async function openDb() {
  await indexedDB.open('pending-requests', { autoIncrement: true })
}

export function addToStore(data) {
  const db = indexedDB.open('pending-requests')
  const transaction = db.transaction('pending-requests', 'readwrite')
  const store = transaction.objectStore('pending-requests-transaction')
  store.add(data)
}

export function getAllFromStore() {
  const db = indexedDB.open('pending-requests')
  const transaction = db.transaction('pending-requests', 'readwrite')
  const store = transaction.objectStore('pending-requests-transaction')
  store.get()
}

