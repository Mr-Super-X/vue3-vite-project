// 路由全局配置（单一事实来源）
//
// - menuSource：菜单加载方式（local = 本地静态；remote = 接口动态）
//   - 默认 = remote（贴近生产，强制走接口）
//   - 切换 local：通过 `pnpm dev:local` 命令（自动设 VITE_MENU_SOURCE=local）
//   - **pnpm dev:local（cross-env）优先级高于 .env**——完整优先级矩阵与机制详见 docs/07 §环境变量优先级矩阵
//
// - historyMode：history 模式（web = createWebHistory；hash = createWebHashHistory）
//   - 默认 = web（主流，URL 干净）
//   - 子路径部署（http://host/sub-path/）→ 用 hash 避免后端 rewrite 复杂性
//   - SSR 场景 → 必须用 web + 服务器端 basename 配置

export type MenuSource = 'local' | 'remote'
export type HistoryMode = 'web' | 'hash'

function resolveMenuSource(): MenuSource {
  const raw = import.meta.env.VITE_MENU_SOURCE
  if (raw === 'remote' || raw === 'local') return raw
  // 默认：remote（贴近生产，强制走接口；本地无 mock 时启动会失败）
  return 'remote'
}

function resolveHistoryMode(): HistoryMode {
  const raw = import.meta.env.VITE_HISTORY_MODE
  if (raw === 'hash' || raw === 'web') return raw
  // 默认：web history（主流，需要后端 SPA fallback，见 README nginx 配置）
  return 'web'
}

function resolveBasePath(): string {
  // 子路径部署场景：在 .env.production 设 VITE_BASE=/sub-path/
  const raw = import.meta.env.VITE_BASE ?? '/'
  // 必须以 / 开头、/ 结尾（vue-router basename 要求）
  if (!raw.startsWith('/')) return `/${raw}`
  if (!raw.endsWith('/')) return `${raw}/`
  return raw
}

export const ROUTER_CONFIG = {
  source: resolveMenuSource(),
  historyMode: resolveHistoryMode(),
  base: resolveBasePath(),
} as const
