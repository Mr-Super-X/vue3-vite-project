// 路由全局配置（单一事实来源）
//
// - menuSource：菜单加载方式（local = 本地静态；remote = 接口动态）
// - 默认 = remote（贴近生产，强制走接口）
// - 切换 local 模式：通过 `pnpm dev:local` 命令（自动设 VITE_MENU_SOURCE=local）
// - 也可手动设环境变量 VITE_MENU_SOURCE=local|remote 覆盖

export type MenuSource = 'local' | 'remote'

function resolveMenuSource(): MenuSource {
  const raw = import.meta.env.VITE_MENU_SOURCE
  if (raw === 'remote' || raw === 'local') return raw
  // 默认：remote（贴近生产，强制走接口；本地无 mock 时启动会失败）
  return 'remote'
}

export const ROUTER_CONFIG = {
  source: resolveMenuSource(),
} as const
