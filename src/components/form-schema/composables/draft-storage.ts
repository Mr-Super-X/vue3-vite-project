import { cloneDeep, omit } from 'lodash-es'
import { Local, Session } from '@/utils/storage'

/** 草稿存储介质 */
export type DraftStorageKind = 'local' | 'session'

function pickStore(kind: DraftStorageKind) {
  return kind === 'session' ? Session : Local
}

/** 读草稿；无草稿或数据损坏（storage.ts safeParse 自动清脏）时返回 null */
export function readDraft(key: string, kind: DraftStorageKind): Record<string, unknown> | null {
  return pickStore(kind).get<Record<string, unknown>>(key)
}

/** 写草稿：cloneDeep 剥离 reactive Proxy + omit 剔除敏感路径；异常仅 warn 不抛出 */
export function writeDraft(
  key: string,
  kind: DraftStorageKind,
  model: Record<string, unknown>,
  exclude: string[]
): void {
  try {
    pickStore(kind).set(key, omit(cloneDeep(model) as Record<string, unknown>, exclude))
  } catch (err) {
    console.warn(`[useFormPersist] 草稿写入失败 (key: ${key}):`, err)
  }
}

/** 删除草稿 */
export function removeDraft(key: string, kind: DraftStorageKind): void {
  pickStore(kind).remove(key)
}
