/**
 * useSearch —— 搜索参数状态管理（spec §六数据流 / §九错误处理 #10 / 附录 A #1/#3/#4）
 *
 * 职责：
 * - 初始化 searchParams（合并 defaultValue + initParam）
 * - search() / reset() / setSearchParams() / getParams()
 * - serializeParams() 剔除 undefined / null / 空字符串（保留 0/false，附录 A #10）
 *
 * **fetchHook 注入设计**（plan critical review #3 修正）：通过 options 显式传入，
 * 不从 props 读取（避免 Object.assign(props, ...) 反 Vue 单向数据流）。
 * ProTable.vue setup 时把 fetchHook 闭包传给 useSearch 与 useTable。
 *
 * @see [`./useTable`](./useTable.ts) 消费方（共享 fetchHook 闭包）
 * @group ProTable composables
 */
import { ref, type Ref } from 'vue'
import type { ProTableProps, TableEngine } from '../types'

/** fetchHook 回调签名 —— 由 ProTable.vue setup 注入 */
export type FetchHook = (opts?: { reset?: boolean }) => Promise<void>

export interface UseSearchOptions {
  props: ProTableProps
  engine: Ref<TableEngine>
  fetchHook?: FetchHook
}

export interface UseSearchReturn {
  searchParams: Ref<Record<string, unknown>>
  /** 触发搜索（保留多选，附录 A #1；保留分页） */
  search: () => Promise<void>
  /** 重置到 defaultValue + 回到第 1 页 + 刷新（保留多选，附录 A #1） */
  reset: () => Promise<void>
  /** 获取当前 searchParams 快照 */
  getParams: () => Record<string, unknown>
  /** 程序化设置搜索参数 + 回到第 1 页 + 刷新（保留多选，附录 A #3） */
  setSearchParams: (params: Record<string, unknown>) => Promise<void>
  /** 序列化参数：剔除 undefined / null / 空字符串（保留 0/false，附录 A #10） */
  serializeParams: (params: Record<string, unknown>) => Record<string, unknown>
}

export function useSearch(options: UseSearchOptions): UseSearchReturn {
  const { props, fetchHook } = options

  // 1) 收集所有 search 配置列的 prop + defaultValue（+ initParam）
  const initialForm: Record<string, unknown> = { ...(props.initParam ?? {}) }
  for (const col of props.columns) {
    if (col.search) {
      initialForm[col.prop] = col.search.defaultValue ?? null
    }
  }

  const searchParams = ref<Record<string, unknown>>(initialForm)

  /** 序列化参数：剔除 undefined / null / 空字符串（保留 0/false，附录 A #10） */
  function serializeParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      out[key] = value
    }
    return out
  }

  /** 获取当前 searchParams 快照 */
  function getParams(): Record<string, unknown> {
    return { ...searchParams.value }
  }

  /** 触发搜索：保留分页（spec §三搜索参数变化时回第 1 页只针对 setSearchParams/reset） */
  async function search(): Promise<void> {
    if (fetchHook) await fetchHook()
  }

  /** 重置：恢复 defaultValue + 回到第 1 页 + 刷新（附录 A #1 不清多选） */
  async function reset(): Promise<void> {
    // 恢复 defaultValue（initParam 是固定参数，不重置）
    for (const col of props.columns) {
      if (col.search) {
        searchParams.value[col.prop] = col.search.defaultValue ?? null
      }
    }
    if (fetchHook) await fetchHook({ reset: true })
  }

  /** 程序化设置：合并 + 回到第 1 页 + 刷新（附录 A #3 不清多选） */
  async function setSearchParams(params: Record<string, unknown>): Promise<void> {
    Object.assign(searchParams.value, params)
    if (fetchHook) await fetchHook({ reset: true })
  }

  return {
    searchParams,
    search,
    reset,
    getParams,
    setSearchParams,
    serializeParams,
  }
}
