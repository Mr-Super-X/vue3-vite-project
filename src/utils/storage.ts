// TTL 机制：写入时若 ttlMs > 0 则记录 expireAt，读取时检查过期
interface StorageItem<T> {
  value: T
  expireAt?: number
}

export const storage = {
  set<T>(key: string, value: T, ttlMs?: number): void {
    const item: StorageItem<T> = { value }
    if (ttlMs) item.expireAt = Date.now() + ttlMs
    localStorage.setItem(key, JSON.stringify(item))
  },

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      const item = JSON.parse(raw) as StorageItem<T>
      if (item.expireAt && Date.now() > item.expireAt) {
        localStorage.removeItem(key)
        return null
      }
      return item.value
    } catch {
      return null
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },
}