/**
 * 字典 Composable。
 *
 * 业务侧推荐用法：
 * ```ts
 * const { options, loading, getLabel, refresh } = useDict('user_status')
 * ```
 *
 * 返回值说明：
 * - `options`：当前字典的 reactive 列表（绑定到 `el-select`）
 * - `loading`：是否正在加载（用于 UI 反馈）
 * - `getLabel`：字典 value → 文案（兜底为 `String(value)`）
 * - `refresh`：强制刷新（用户手动点"刷新"或管理员改字典后）
 *
 * 首次调用会自动触发 lazy fetch，业务无需手动 await。
 * 多次实例化同一 key：复用 store 缓存（5min 内不发请求）。
 *
 * @see [`src/store/modules/dict`](../store/modules/dict) dicts 缓存与 fetchDict
 * @see [`src/api/modules/dict.ts`](../api/modules/dict.ts) dictApi.getByType
 * @group 字典组合式 API
 */

import type { ComputedRef } from 'vue'
import { useDictStore } from '@/store/modules/dict'
import type { DictEntry } from '@/api/modules/dict'

/**
 * useDict 返回值类型。
 *
 * @group 字典组合式 API
 */
export interface UseDictReturn {
  /** reactive 字典列表（绑定到 `el-select` 等 UI 组件） */
  options: ComputedRef<DictEntry[]>
  /** 是否正在加载 */
  loading: ComputedRef<boolean>
  /** value → 显示文本（兜底为 `String(value)`） */
  getLabel: (value: string | number | null | undefined) => string
  /** 强制刷新（用户手动或管理员改字典后） */
  refresh: () => Promise<void>
}

/**
 * 获取指定类型字典的响应式引用 + 操作方法。
 *
 * 自动触发 lazy fetch（首次 setup 阶段 + 组件挂载后双重保险）。
 * 多次实例化同一 key：复用 `useDictStore` 缓存。
 *
 * @param type 字典类型（如 `'user_status'`）
 * @returns useDict 返回值（options / loading / getLabel / refresh）
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useDict } from '@composables/useDict'
 * const { options, loading, getLabel } = useDict('user_status')
 * </script>
 *
 * <template>
 *   <el-select :loading="loading" v-model="value">
 *     <el-option v-for="o in options" :key="o.value" :value="o.value" :label="o.label" />
 *   </el-select>
 * </template>
 * ```
 *
 * @group 字典组合式 API
 */
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
