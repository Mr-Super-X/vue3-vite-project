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
  const { key, model, storage = 'local', exclude = [], restoreFilter } = options
  const debounceMs = options.debounce ?? 400
  const hasDraft = ref(readDraft(key, storage) !== null)
  const lastSavedAt = ref<number | null>(null)
  function persistNow(): void {
    writeDraft(key, storage, model, exclude)
    lastSavedAt.value = Date.now()
  }
  function cancelPending(): void {
    debouncedWrite.cancel()
    pendingSave = false
  }
  function load(): boolean {
    const draft = readDraft(key, storage)
    if (draft === null) return false
    const filtered = restoreFilter ? restoreFilter(draft) : draft
    if (filtered === null) {
      removeDraft(key, storage)
      hasDraft.value = false
      return false
    }
    Object.assign(model, filtered)
    return true
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
