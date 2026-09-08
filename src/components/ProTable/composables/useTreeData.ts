import type { TreeConfig } from '../types'
/** 树形数据节点结构 —— ProTable 内部状态字段以 _ 开头（业务不应读写）@group ProTable Composables */
export interface TreeNode extends Record<string, unknown> {
  id: string | number
  children?: TreeNode[]
  _hasChildren?: boolean
  _loaded?: boolean
  _level?: number
}
/** 树形数据 composable（spec §5.2）@group ProTable Composables */
export function useTreeData(config: TreeConfig) {
  const expanded = ref<Set<string | number>>(new Set())
  const loading = ref<Set<string | number>>(new Set())
  const timers = new Map<string | number, ReturnType<typeof setTimeout>>()
  const cKey = config.childrenKey ?? 'children',
    rKey = config.rowKey ?? 'id',
    dExp = config.defaultExpandDepth ?? 0
  const roots: TreeNode[] = []
  const seek = (
    k: string | number,
    ns: TreeNode[],
    acc: TreeNode[] = []
  ): { node: TreeNode; path: TreeNode[] } | null => {
    for (const n of ns) {
      if (n[rKey] === k) return { node: n, path: acc }
      if (n[cKey]) {
        const r = seek(k, n[cKey] as TreeNode[], [...acc, n])
        if (r) return r
      }
    }
    return null
  }
  const dfs = (ns: TreeNode[], lv: number, onVisit: (n: TreeNode, lv: number) => void): void => {
    for (const n of ns) {
      onVisit(n, lv)
      if (n[cKey] && Array.isArray(n[cKey])) dfs(n[cKey] as TreeNode[], lv + 1, onVisit)
    }
  }
  /** 触发 expanded 响应式（Set 的 add/delete 不会自动通知 ref，必须替换整个 Set） */
  const touchExpanded = (): void => {
    expanded.value = new Set(expanded.value)
  }
  /**
   * v2.0 扁平化树形数据：按 expanded 状态生成 el-table 可用的扁平数组
   * - 节点 _level=0 总是展示
   * - 已展开节点的 children 加入扁平数组（递归）
   * - 未展开节点的 children 不展示
   */
  const flatten = (ns: TreeNode[], out: TreeNode[]): void => {
    for (const n of ns) {
      out.push(n)
      if (expanded.value.has(n[rKey] as string | number) && n[cKey] && Array.isArray(n[cKey])) {
        flatten(n[cKey] as TreeNode[], out)
      }
    }
  }
  return {
    normalize(data: TreeNode[]) {
      roots.length = 0
      roots.push(...data)
      dfs(data, 0, (n, lv) => {
        n._level = lv
        if (dExp > 0 && lv <= dExp) expanded.value.add(n[rKey] as string | number)
      })
      touchExpanded() // 触发响应式
      // v2.0 修复：默认展开 + 搜索命中的节点若 _hasChildren=true 且未加载，自动触发懒加载（spec §5.2）
      for (const key of [...expanded.value]) {
        const r = seek(key, roots)
        if (r?.node._hasChildren && !r.node._loaded && config.loadChildren) {
          void config
            .loadChildren(r.node)
            .then((children) => {
              r.node[cKey] = children as TreeNode[]
              for (const c of children) c._level = (r.node._level ?? 0) + 1
              r.node._loaded = true
              touchExpanded() // 触发响应式（flattenData 重新计算）
            })
            .catch((err: unknown) => {
              console.error('[useTreeData] normalize auto load failed:', err)
            })
        }
      }
      return data
    },
    /** v2.0 新增：按展开状态扁平化树形数据，el-table :data 直接使用 */
    flattenData(): TreeNode[] {
      const out: TreeNode[] = []
      flatten(roots, out)
      return out
    },
    isExpanded: (k: string | number) => expanded.value.has(k),
    expandAll: () => {
      const keys: (string | number)[] = []
      dfs(roots, 0, (n) => keys.push(n[rKey] as string | number))
      keys.forEach((k) => expanded.value.add(k))
      touchExpanded()
    },
    collapseAll: () => {
      expanded.value.clear()
      touchExpanded()
    },
    async toggle(k: string | number) {
      if (loading.value.has(k)) return
      if (expanded.value.has(k)) {
        expanded.value.delete(k)
        return
      }
      loading.value.add(k)
      try {
        const p = timers.get(k)
        if (p) clearTimeout(p)
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(async () => {
            try {
              if (config.loadChildren) {
                const r = seek(k, roots)
                if (r?.node._hasChildren && !r.node._loaded) {
                  const cs = await config.loadChildren(r.node)
                  r.node[cKey] = cs as TreeNode[]
                  for (const c of cs) c._level = (r.node._level ?? 0) + 1
                  r.node._loaded = true
                }
              }
              resolve()
            } catch (e) {
              reject(e)
            }
          }, config.loadDebounce ?? 200)
          timers.set(k, t)
        })
        expanded.value.add(k)
        touchExpanded()
      } catch (err) {
        console.error('[useTreeData] lazy load failed:', err)
      } finally {
        loading.value.delete(k)
      }
    },
    async revealKeys(m: Set<string | number>) {
      for (const k of m) {
        const r = seek(k, roots)
        if (r) r.path.forEach((n) => expanded.value.add(n[rKey] as string | number))
        expanded.value.add(k)
      }
    },
    expandedKeys: computed(() => expanded.value),
  }
}
