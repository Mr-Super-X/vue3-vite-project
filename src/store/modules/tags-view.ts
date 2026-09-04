// 多页签状态管理
//
// 设计要点：
//   - visitedViews: 已访问路由的 UI 渲染列表（按访问顺序）
//   - cachedViews: 实际进入 keep-alive 的 name 列表（与 visitedViews 同步，但排除已关闭的非 affix）
//   - affix: meta.affix === true 的路由（如 Home）始终保留，用户无法关闭
//   - 不持久化：避免换账号看到上个账号的 tab（设计取舍）
//
// 路由参数变化策略（如 /user/1 → /user/2）：
//   - 同一 name 在 visitedViews 中只保留一条，path 更新到最新
//   - cachedViews 不变（keep-alive 缓存复用，组件实例仍在）

import type { RouteLocationNormalized } from 'vue-router'

export interface TagView {
  /** 路由 name（字符串化），作为唯一键 */
  name: string
  /** 完整路径（含 query），用于路由切换 */
  path: string
  /** 渲染名（meta.title || name） */
  title: string
  /** meta.affix === true 时为固定 tag（如 Home），不可关闭 */
  affix?: boolean
}

/**
 * 把 RouteLocationNormalized 转为 TagView。
 *
 * 排除无 name 的路由（layout 包裹层、404 catch-all、白名单本身）。
 *
 * @returns TagView 或 null（路由无 name 时）
 */
function toTag(route: RouteLocationNormalized): TagView | null {
  if (!route.name) return null
  return {
    name: String(route.name),
    path: route.fullPath,
    title: (route.meta?.title as string | undefined) ?? String(route.name),
    affix: route.meta?.affix === true,
  }
}

export const useTagsViewStore = defineStore('tags-view', () => {
  const visitedViews = ref<TagView[]>([])
  const cachedViews = ref<string[]>([])

  /** 添加一个 tag；同名已存在则更新 path（路由参数变化场景）。 */
  function addView(view: TagView): void {
    const existing = visitedViews.value.find((v) => v.name === view.name)
    if (existing) {
      existing.path = view.path
      return
    }
    visitedViews.value.push(view)
    if (!cachedViews.value.includes(view.name)) {
      cachedViews.value.push(view.name)
    }
  }

  /** 移除一个 tag；affix=true 时拒绝（返回 false 表示没删成）。 */
  function removeView(view: TagView): boolean {
    const target = visitedViews.value.find((v) => v.name === view.name)
    if (!target) return false
    if (target.affix) return false

    visitedViews.value = visitedViews.value.filter((v) => v.name !== view.name)
    cachedViews.value = cachedViews.value.filter((n) => n !== view.name)
    return true
  }

  /** 关闭其他：保留当前 tag 与所有 affix tag。 */
  function closeOthers(view: TagView): void {
    visitedViews.value = visitedViews.value.filter((v) => v.affix || v.name === view.name)
    cachedViews.value = cachedViews.value.filter(
      (n) => visitedViews.value.findIndex((v) => v.name === n) !== -1
    )
  }

  /** 关闭全部：仅保留 affix tag。 */
  function closeAll(): void {
    visitedViews.value = visitedViews.value.filter((v) => v.affix)
    cachedViews.value = cachedViews.value.filter(
      (n) => visitedViews.value.findIndex((v) => v.name === n) !== -1
    )
  }

  /** router.afterEach 钩子入口（仅展示用），已处理路由无 name 的情况。 */
  function addRouteView(route: RouteLocationNormalized): void {
    const tag = toTag(route)
    if (tag) addView(tag)
  }

  return {
    visitedViews,
    cachedViews,
    addView,
    removeView,
    closeOthers,
    closeAll,
    addRouteView,
  }
})
