// tags-view store 单测
//
// 覆盖：
//   - addView：基本去重 + 同名更新 path
//   - removeView：基本删除 + affix 拒绝删除
//   - closeOthers：保留 current + affix
//   - closeAll：仅保留 affix
//   - cachedViews 与 visitedViews 同步性
//   - addRouteView：跳过无 name 路由

import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTagsViewStore, type TagView } from './tags-view'
import type { RouteLocationNormalized } from 'vue-router'

function makeTag(overrides: Partial<TagView> = {}): TagView {
  return {
    name: 'Dashboard',
    path: '/dashboard',
    title: '仪表盘',
    affix: false,
    ...overrides,
  }
}

/** 构造 addRouteView 接受的 RouteLocationNormalized 简化版（只填 store 用到的字段）。 */
function makeRoute(
  name: string | null,
  meta: Record<string, unknown> = {}
): RouteLocationNormalized {
  return {
    name,
    fullPath: `/mock/${String(name)}`,
    meta,
  } as unknown as RouteLocationNormalized
}

describe('useTagsViewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addView', () => {
    it('基本添加 + cachedViews 同步', () => {
      const store = useTagsViewStore()
      store.addView(makeTag({ name: 'A' }))

      expect(store.visitedViews).toHaveLength(1)
      expect(store.visitedViews[0]?.name).toBe('A')
      expect(store.cachedViews).toContain('A')
    })

    it('同名重复添加：不新增 + 更新 path', () => {
      const store = useTagsViewStore()
      store.addView(makeTag({ name: 'A', path: '/a/1' }))
      store.addView(makeTag({ name: 'A', path: '/a/2' }))

      expect(store.visitedViews).toHaveLength(1)
      expect(store.visitedViews[0]?.path).toBe('/a/2')
      expect(store.cachedViews).toEqual(['A'])
    })
  })

  describe('removeView', () => {
    it('基本删除 + cachedViews 同步移除', () => {
      const store = useTagsViewStore()
      store.addView(makeTag({ name: 'A' }))
      store.addView(makeTag({ name: 'B' }))

      const ok = store.removeView(makeTag({ name: 'A' }))

      expect(ok).toBe(true)
      expect(store.visitedViews.map((v) => v.name)).toEqual(['B'])
      expect(store.cachedViews).toEqual(['B'])
    })

    it('affix tag 拒绝删除', () => {
      const store = useTagsViewStore()
      const dashboard = makeTag({ name: 'Dashboard', affix: true })
      store.addView(dashboard)
      store.addView(makeTag({ name: 'A' }))

      const ok = store.removeView(dashboard)

      expect(ok).toBe(false)
      expect(store.visitedViews.map((v) => v.name)).toEqual(['Dashboard', 'A'])
      expect(store.cachedViews).toEqual(['Dashboard', 'A'])
    })

    it('删除不存在的 tag 返回 false', () => {
      const store = useTagsViewStore()
      const ok = store.removeView(makeTag({ name: 'X' }))
      expect(ok).toBe(false)
    })
  })

  describe('closeOthers', () => {
    it('保留 current + 所有 affix tag', () => {
      const store = useTagsViewStore()
      store.addView(makeTag({ name: 'Dashboard', affix: true, path: '/dashboard' }))
      store.addView(makeTag({ name: 'A', path: '/a' }))
      store.addView(makeTag({ name: 'B', path: '/b' }))
      store.addView(makeTag({ name: 'C', path: '/c' }))

      store.closeOthers(makeTag({ name: 'B' }))

      expect(store.visitedViews.map((v) => v.name)).toEqual(['Dashboard', 'B'])
      expect(store.cachedViews).toEqual(['Dashboard', 'B'])
    })
  })

  describe('closeAll', () => {
    it('仅保留 affix tag', () => {
      const store = useTagsViewStore()
      store.addView(makeTag({ name: 'Dashboard', affix: true }))
      store.addView(makeTag({ name: 'A' }))
      store.addView(makeTag({ name: 'B' }))

      store.closeAll()

      expect(store.visitedViews.map((v) => v.name)).toEqual(['Dashboard'])
      expect(store.cachedViews).toEqual(['Dashboard'])
    })
  })

  describe('addRouteView', () => {
    it('无 name 的路由不加入（layout 包装 / 404）', () => {
      const store = useTagsViewStore()
      store.addRouteView(makeRoute(null))
      expect(store.visitedViews).toEqual([])
      expect(store.cachedViews).toEqual([])
    })

    it('带 meta.affix === true 的路由标记为 affix', () => {
      const store = useTagsViewStore()
      store.addRouteView(makeRoute('Dashboard', { title: 'Dashboard', affix: true }))
      expect(store.visitedViews[0]?.affix).toBe(true)
    })
  })
})
