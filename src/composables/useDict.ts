// 字典 Composable
//
// 业务侧推荐用法：
//   const { options, loading, getLabel, refresh } = useDict('user_status')
//
//  - options: 当前字典的 reactive 列表（绑定到 el-select）
//  - loading: 是否正在加载（用于 UI 反馈）
//  - getLabel: 字典 value → 文案（兜底为 String(value)）
//  - refresh: 强制刷新（用户手动点"刷新"或管理员改字典后）
//
// 首次调用会自动触发 lazy fetch，业务无需手动 await。
// 多次实例化同一 key：复用 store 缓存（5min 内不发请求）。

import { computed, onMounted, ref, type ComputedRef } from 'vue'
import { useDictStore } from '@/store/modules/dict'
import type { DictEntry } from '@/api/modules/dict'

export interface UseDictReturn {
  options: ComputedRef<DictEntry[]>
  loading: ComputedRef<boolean>
  getLabel: (value: string | number | null | undefined) => string
  refresh: () => Promise<void>
}

export function useDict(type: string): UseDictReturn {
  const store = useDictStore()
  const started = ref(false)

  // setup 阶段触发 lazy fetch；onMounted 阶段已经在 store 中加载过的话直接命中缓存
  if (!started.value) {
    started.value = true
    void store.fetchDict(type)
  }

  onMounted(() => {
    // 组件挂载后再触发一次，确保 SSR / 异步 setup 场景也能命中
    if (!store.dicts[type]) {
      void store.fetchDict(type)
    }
  })

  const options = computed<DictEntry[]>(() => store.dicts[type] ?? [])
  const loading = computed<boolean>(() => store.loading.has(type))

  function getLabel(value: string | number | null | undefined): string {
    return store.getLabel(type, value)
  }

  async function refresh(): Promise<void> {
    await store.fetchDict(type, true)
  }

  return { options, loading, getLabel, refresh }
}
