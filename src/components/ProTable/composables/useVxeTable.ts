/**
 * useVxeTable —— vxe-table 引擎适配层（spec 决策 1：动态按需加载）
 *
 * 职责：
 * - 动态 import('vxe-table')，缓存 module（避免重复加载）
 * - import 失败时抛错（spec §九 #7：上层 catch 后切回 element-plus）
 *
 * **P5 骨架版**：第一版仅交付骨架（dynamic import + module 缓存 + 失败兜底），
 * vxe-table 引擎的完整 UI 渲染（column 映射 / event 桥接）在后续迭代补充。
 *
 * @group ProTable composables
 */

/** vxe-table 模块结构（仅声明用到的部分，避免引入整个类型声明） */
export interface VxeModule {
  default: {
    Table: unknown
    Column: unknown
  }
}

let cachedModule: VxeModule | null = null
let loadingPromise: Promise<VxeModule> | null = null

export interface UseVxeTableReturn {
  /** 加载 vxe-table（首次调用触发 import，后续返回缓存） */
  loadVxeTable: () => Promise<VxeModule>
  /** vxe-table 是否已加载完成 */
  isLoaded: () => boolean
  /** 清除缓存（卸载时调用） */
  reset: () => void
}

export function useVxeTable(): UseVxeTableReturn {
  /** 动态加载 vxe-table 模块（spec 决策 1：dynamic import） */
  async function loadVxeTable(): Promise<VxeModule> {
    if (cachedModule) return cachedModule
    if (loadingPromise) return loadingPromise
    // vxe-table 动态 import（CLAUDE.md §1.6.1 vxe-table 来源注释：仅动态加载）
    loadingPromise = import('vxe-table')
      .then((mod) => {
        cachedModule = mod as unknown as VxeModule
        return cachedModule
      })
      .finally(() => {
        loadingPromise = null
      })
    return loadingPromise
  }

  /** 是否已加载（vxe-table 引擎首次切换后变为 true） */
  function isLoaded(): boolean {
    return cachedModule !== null
  }

  /** 清除缓存（spec §九 #7 失败兜底：catch 后切回 element-plus） */
  function reset(): void {
    cachedModule = null
    loadingPromise = null
  }

  return { loadVxeTable, isLoaded, reset }
}
