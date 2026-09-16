/**
 * useStatePersist —— 搜索参数 / 分页 / 排序状态的路由级持久化（v3.1 新增）。
 *
 * 解决场景：列表页 → 详情页 → 返回列表，搜索条件、页码、排序全部丢失需重填。
 * 依赖 tableKey 作为存储 key（与 useColumns 列设置持久化同一约定，互不干扰）。
 *
 * 恢复时机判定（用户决策：浏览器刷新不恢复，路由返回恢复）：
 * - localStorage 存状态快照；sessionStorage 存 alive 标记
 * - 组件 mounted 后写 alive 标记；window beforeunload（F5 刷新 / 关闭标签页）清标记
 * - 路由跳走组件卸载不触发 beforeunload → alive 保留 → 返回时 read() 命中 → 恢复快照
 * - F5 刷新触发 beforeunload → alive 已清 → read() 未命中 → 视为新会话，旧快照一并清除
 * - sessionStorage 按标签页隔离：新开标签页打开同页不会误恢复
 *
 * 时序约束：read() 必须在 useTable 创建之前同步调用（快照作为 initialState
 * 注入 ref 初值，避开 useTable 内 page watcher 双发问题）；attach() 在 mounted
 * 后调用（此时首次请求已发出，开始监听写回）。
 *
 * @see [`./useColumns`](./useColumns.ts) 同一 tableKey 存储约定（`:columns` 后缀）
 * @group ProTable composables
 */
import { watch, onScopeDispose, type Ref } from 'vue' // vue（生命周期/底层 API）
import { Local } from '@/utils/storage' // 与 useColumns 同款封装（plan critical review #5）
import type { SortState } from '../types'

/** 快照结构 —— version 字段预留未来迁移（结构变更时按版本分派恢复逻辑） */
export interface PersistedTableState {
  version: 1
  searchParams: Record<string, unknown>
  page: number
  pageSize: number
  sortState: SortState | null
}

export interface UseStatePersistOptions {
  /** 存储 key 前缀（props.tableKey）；空串/undefined 时全部操作 no-op（未传 tableKey 不持久化） */
  tableKey: string | undefined
  /** 是否启用（props.statePersist） */
  enabled: boolean
}

/** attach 的监听源 —— 全部经 Ref 注入，composable 不感知 useSearch/useTable 内部结构 */
export interface PersistSources {
  searchParams: Ref<Record<string, unknown>>
  page: Ref<number>
  pageSize: Ref<number>
  sortState: Ref<SortState | null>
}

export interface UseStatePersistReturn {
  /**
   * 读取快照 —— setup 早期同步调用。
   * @returns 命中（alive 标记在 + 快照结构合法）返回快照；否则 null（新会话/未启用/未传 tableKey）
   */
  read: () => PersistedTableState | null
  /** 挂载写回监听 —— mounted 后调用一次；未启用 / 未传 tableKey 时 no-op */
  attach: (sources: PersistSources) => void
}

export function useStatePersist(options: UseStatePersistOptions): UseStatePersistReturn {
  const active = Boolean(options.enabled && options.tableKey)
  const stateKey = active ? `${options.tableKey}:state` : ''
  const aliveKey = active ? `${options.tableKey}:state-alive` : ''

  /** sessionStorage 原生访问 —— 项目 Local 封装仅覆盖 localStorage；隐私模式可能抛错，整体 try 防御 */
  function readAlive(): boolean {
    try {
      return window.sessionStorage.getItem(aliveKey) === '1'
    } catch {
      return false
    }
  }
  function writeAlive(): void {
    try {
      window.sessionStorage.setItem(aliveKey, '1')
    } catch {
      /* 存储不可用时降级为「永不恢复」，不阻断表格主流程 */
    }
  }
  function clearAlive(): void {
    try {
      window.sessionStorage.removeItem(aliveKey)
    } catch {
      /* 同 readAlive */
    }
  }

  /** 快照结构校验（fail-safe：字段缺失/类型不符一律视为无快照，不部分恢复） */
  function isValidSnapshot(raw: unknown): raw is PersistedTableState {
    if (!raw || typeof raw !== 'object') return false
    const s = raw as Record<string, unknown>
    return (
      s.version === 1 &&
      typeof s.searchParams === 'object' &&
      s.searchParams !== null &&
      typeof s.page === 'number' &&
      typeof s.pageSize === 'number' &&
      (s.sortState === null || typeof s.sortState === 'object')
    )
  }

  function read(): PersistedTableState | null {
    if (!active) return null
    if (!readAlive()) {
      // 新会话（F5 刷新 / 新标签页）：旧快照语义已过期，清除避免后续误恢复
      Local.remove(stateKey)
      return null
    }
    const raw: unknown = Local.get(stateKey)
    if (!isValidSnapshot(raw)) {
      Local.remove(stateKey)
      return null
    }
    return raw
  }

  function attach(sources: PersistSources): void {
    if (!active) return
    writeAlive()

    /** 合并写回（单一写入点，避免多 watcher 各自序列化） */
    function persist(): void {
      const snapshot: PersistedTableState = {
        version: 1,
        searchParams: { ...sources.searchParams.value },
        page: sources.page.value,
        pageSize: sources.pageSize.value,
        sortState: sources.sortState.value,
      }
      Local.set(stateKey, snapshot)
    }

    // 4 个源任一变化即写回；分页/搜索/排序均低频交互，无需防抖
    const stops = [
      watch(sources.searchParams, persist, { deep: true }),
      watch(sources.page, persist),
      watch(sources.pageSize, persist),
      watch(sources.sortState, persist),
    ]

    // 刷新 / 关闭标签页：清 alive → 下次进入视为新会话不恢复。
    // 路由跳走（组件卸载）不触发 beforeunload，alive 保留，返回时恢复
    window.addEventListener('beforeunload', clearAlive)
    onScopeDispose(() => {
      stops.forEach((stop) => stop())
      window.removeEventListener('beforeunload', clearAlive)
    })
  }

  return { read, attach }
}
