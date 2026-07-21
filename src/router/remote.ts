// 接口加载菜单（remote 模式）
//
// 工作流：
//   1. fetchRemoteRoutes() 调用 /api/menu 拉取菜单 JSON
//   2. convertMenu() 把 JSON 转换为 Vue Router 路由配置
//   3. 在守卫中 router.addRoute() 注入
//
// 失败策略：
//   - fetchRemoteRoutes() 内部捕获异常，返回空数组
//   - 由守卫负责 fallback：返回空数组时 console.warn + 保持 local 菜单
//
// 后端菜单 JSON 约定（详见 src/router/types.ts）：
//   { name: RouteName; path: string; meta?: RouteMeta; children?: RemoteMenuItem[] }

import type { RouteRecordRaw } from 'vue-router'
import { menuApi } from '@/api/modules/menu'
import { COMPONENT_REGISTRY } from './component-registry'
import type { RouteName, RemoteMenuItem } from './types'

/**
 * 拉取后端菜单 JSON，转换为 Vue Router 路由配置。
 *
 * 失败行为：网络错误 / 业务错误均返回空数组 + console.warn。
 * 由调用方（guards/auth.ts）决定如何 fallback。
 */
export async function fetchRemoteRoutes(): Promise<RouteRecordRaw[]> {
  try {
    const menu = await menuApi.getMenu()
    return convertMenu(menu)
  } catch (err) {
    console.warn('[router/remote] 接口加载菜单失败:', err)
    return []
  }
}

/**
 * 把后端菜单 JSON 转换为 Vue Router 路由配置。
 * 未知 name（不在 COMPONENT_REGISTRY 中）的项会被跳过并 warn。
 */
function convertMenu(menu: RemoteMenuItem[]): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []
  for (const item of menu) {
    const route = convertItem(item)
    if (route) result.push(route)
  }
  return result
}

function convertItem(item: RemoteMenuItem): RouteRecordRaw | null {
  const loader = COMPONENT_REGISTRY[item.name as RouteName]
  if (!loader) {
    console.warn(
      `[router/remote] 未注册的路由 name: ${item.name}（需在 component-registry.ts 中添加）`
    )
    return null
  }

  // 后端 hidden: true → 转换为前端约定的 meta.visible: false
  // 守卫（guards/auth.ts）检查到 visible: false 时跳 /404，
  // 实现"菜单不可见 → 路由不可访问"的双轨收紧。
  let meta: RouteRecordRaw['meta'] | undefined
  if (item.meta) {
    if (item.meta.hidden) {
      // 删除 hidden 字段，加 visible: false 标记
      const { hidden: _hidden, ...rest } = item.meta
      meta = { ...rest, visible: false }
    } else {
      meta = item.meta
    }
  }

  // 注意：tsconfig 启用了 exactOptionalPropertyTypes，
  // `meta?: RouteMeta` 与 `meta: RouteMeta | undefined` 不兼容。
  // 用条件展开：仅在 meta 实际存在时才设置 meta 属性（不显式赋 undefined）。
  return {
    path: item.path,
    name: item.name,
    component: loader as RouteRecordRaw['component'],
    ...(meta ? { meta } : {}),
    ...(item.children ? { children: convertMenu(item.children) } : {}),
  } as RouteRecordRaw
}
