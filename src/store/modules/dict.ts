// 字典状态管理
//
// 设计要点：
//   - 业务调用 useDict('user_status') 触发 fetchDict（lazy）
//   - 30s 网络层缓存：http.ts 拦截器（防 429 / 雪崩）
//   - 5min 业务层缓存：本 store（跨页面共享，避免重复 await）
//   - 登录后守卫钩子调用 preloadDict 预加载 PRELOAD_DICT_KEYS
//   - 用户登出 / 切换账号调 clear 清空
//
// 业务侧不要直接调 dictApi.getByType，统一通过 useDict。
//
// PRELOAD_DICT_KEYS：登录后立即拉的字典（修改此处即可）

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dictApi, type DictEntry } from '@/api/modules/dict'

/** 业务层缓存时间（毫秒）。比 http.ts 网络层 30s 更长，避免重复进入业务逻辑。 */
const STORE_TTL_MS = 5 * 60 * 1000

/** 轮询兜底：防止并发请求同一字典的简易机制（16ms 轮询）。 */
const POLL_INTERVAL_MS = 16

/** 登录后立即预加载的字典列表（新业务字典按需加入）。 */
export const PRELOAD_DICT_KEYS: readonly string[] = ['user_status', 'role']

export const useDictStore = defineStore('dict', () => {
  const dicts = ref<Record<string, DictEntry[]>>({})
  const lastFetchAt = ref<Record<string, number>>({})
  const loading = ref<Set<string>>(new Set())

  /**
   * 拉取一个字典（缓存命中直接返回，未命中/过期则重新发请求）。
   *
   * @param type 字典类型（如 'user_status'）
   * @param force 强制刷新（忽略缓存），refresh() 会传 true
   */
  async function fetchDict(type: string, force = false): Promise<DictEntry[]> {
    // 缓存命中
    if (!force) {
      const last = lastFetchAt.value[type]
      if (last && Date.now() - last < STORE_TTL_MS && dicts.value[type]) {
        return dicts.value[type]!
      }
    }

    // 已在加载：轮询等待现有请求完成（避免并发请求同一字典）
    if (loading.value.has(type)) {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (!loading.value.has(type)) {
            clearInterval(timer)
            resolve()
          }
        }, POLL_INTERVAL_MS)
      })
      return dicts.value[type] ?? []
    }

    loading.value.add(type)
    try {
      const data = await dictApi.getByType(type)
      dicts.value[type] = data
      lastFetchAt.value[type] = Date.now()
      return data
    } finally {
      loading.value.delete(type)
    }
  }

  /**
   * 批量预加载（登录后守卫调用）。
   * 网络失败某一项不阻塞其他，错误被内层 fetchDict 抛出后由守卫的 try/catch 处理。
   */
  async function preloadDict(types: readonly string[] = PRELOAD_DICT_KEYS): Promise<void> {
    await Promise.all(types.map((t) => fetchDict(t)))
  }

  /**
   * 从已加载字典中查 value 对应的 label。
   * 未找到兜底为 String(value)，保证 UI 渲染不报错。
   */
  function getLabel(type: string, value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    const list = dicts.value[type]
    if (!list) return String(value)
    const entry = list.find((e) => e.value === value)
    return entry?.label ?? String(value)
  }

  /** 清空全部缓存（用户登出 / 切换账号时调用）。 */
  function clear(): void {
    dicts.value = {}
    lastFetchAt.value = {}
    loading.value.clear()
  }

  return { dicts, loading, lastFetchAt, fetchDict, preloadDict, getLabel, clear }
})
