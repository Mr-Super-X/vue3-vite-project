import { onScopeDispose, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import { readDraft, removeDraft, writeDraft } from './draft-storage'

export interface FormPersistOptions {
  key: string // 草稿唯一 key：建议 '<模块>.<表单名>.draft'，经 storage.ts namespace 隔离
  model: Record<string, unknown> // 被监听的 reactive model
  storage?: 'local' | 'session' // 默认 'local'（跨会话保留）；'session' 关标签页失效
  debounce?: number // 自动保存防抖 ms，默认 400
  exclude?: string[] // 敏感字段 lodash 路径（如 'card.cvv'），序列化剔除、不落盘
  restoreFilter?: (draft: Record<string, unknown>) => Record<string, unknown> | null // null=丢弃草稿
  /** schema 版本号：配置后草稿写版本信封，版本不匹配的旧草稿 load 时自动丢弃（防 schema 升级污染 model） */
  schemaVersion?: string | number
}
export interface FormPersistReturn {
  save(): void
  load(): boolean
  clear(): void
  hasDraft: Ref<boolean>
  lastSavedAt: Ref<number | null>
}
/**
 * 草稿持久化：防抖自动落盘 + beforeunload flush 兜底；不自动恢复，由使用方按 hasDraft 决定 load() 时机。
 * 边界：exclude 字段不落盘、序列化异常仅 warn；副作用：写 storage、注册 beforeunload 监听（scope 内自动清理）。
 */
export function useFormPersist(options: FormPersistOptions): FormPersistReturn {
  const { key, model, storage = 'local', exclude = [], restoreFilter, schemaVersion } = options
  const debounceMs = options.debounce ?? 400
  const hasDraft = ref(readDraft(key, storage) !== null)
  const lastSavedAt = ref<number | null>(null)
  function persistNow(): void {
    writeDraft(key, storage, model, exclude, schemaVersion)
    lastSavedAt.value = Date.now()
  }
  function cancelPending(): void {
    debouncedWrite.cancel()
    pendingSave = false
  }
  function load(): boolean {
    const raw = readDraft(key, storage)
    if (raw === null) return false
    let draft = raw
    if (schemaVersion !== undefined) {
      // 版本信封校验：无信封或版本不匹配 → 旧草稿直接丢弃（schema 升级后多余 key 会污染 model）
      if ((raw as { __v?: unknown }).__v !== schemaVersion) {
        removeDraft(key, storage)
        hasDraft.value = false
        return false
      }
      draft = ((raw as { data?: Record<string, unknown> }).data ?? {}) as Record<string, unknown>
    }
    const filtered = restoreFilter ? restoreFilter(draft) : draft
    if (filtered === null) {
      removeDraft(key, storage)
      hasDraft.value = false
      return false
    }
    mergeDraft(model, filtered)
    return true
  }

  /** 深合并草稿到 model：嵌套对象逐层合并（保留 schema 新增字段的默认值）；
   *  数组/原始值整体替换（数组按索引合并会残留旧尾项） */
  function mergeDraft(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(source)) {
      const existing = target[k]
      if (
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        existing !== null &&
        typeof existing === 'object' &&
        !Array.isArray(existing)
      ) {
        mergeDraft(existing as Record<string, unknown>, v as Record<string, unknown>)
      } else {
        target[k] = v
      }
    }
  }
  // pendingSave：防抖窗口内存在未落盘变更的标记，beforeunload 据此同步 flush
  let pendingSave = false
  const debouncedWrite = debounce(() => {
    pendingSave = false
    persistNow()
  }, debounceMs)
  watch(model, () => {
    pendingSave = true
    debouncedWrite()
  })
  function save(): void {
    cancelPending()
    persistNow()
  }
  function clear(): void {
    cancelPending()
    removeDraft(key, storage)
    hasDraft.value = false
    lastSavedAt.value = null
  }
  function flushPending(): void {
    if (!pendingSave) return
    cancelPending()
    persistNow()
  }
  window.addEventListener('beforeunload', flushPending)
  onScopeDispose(() => {
    flushPending()
    window.removeEventListener('beforeunload', flushPending)
  })
  return { save, load, clear, hasDraft, lastSavedAt }
}
