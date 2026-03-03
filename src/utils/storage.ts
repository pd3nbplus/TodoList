interface BrowserStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function getBrowserStorage(): BrowserStorageLike | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }

  return window.localStorage
}

export function canUseStorage(): boolean {
  const storage = getBrowserStorage()
  if (!storage) {
    return false
  }

  const probeKey = '__todo_storage_probe__'
  try {
    storage.setItem(probeKey, '1')
    storage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

export function readJson<T>(key: string): T | null {
  const storage = getBrowserStorage()
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(key)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  const storage = getBrowserStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorageKey(key: string): void {
  const storage = getBrowserStorage()
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}
