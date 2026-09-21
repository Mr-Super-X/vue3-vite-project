import path from 'node:path'

/**
 * src 下子目录别名映射（单一来源）
 *
 * 新增 src 子目录时只需在这里加一行，生成器会自动同步到 tsconfig.app.json
 * 与 vite.config.ts 的 resolve.alias。
 */
export const SRC_DIR_ALIASES = {
  '@': '',
  '@api': 'api',
  '@assets': 'assets',
  '@components': 'components',
  '@composables': 'composables',
  '@directives': 'directives',
  '@enums': 'enums',
  '@layouts': 'layouts',
  '@locales': 'locales',
  '@modules': 'modules',
  '@plugins': 'plugins',
  '@router': 'router',
  '@store': 'store',
  '@types': 'types',
  '@utils': 'utils',
} as const

/**
 * 项目根（非 src/）目录别名映射（单一来源）
 *
 * 与 SRC_DIR_ALIASES 的区别：解析时直接绑定到 cwd/<sub>，不拼接 src/。
 * 当前用途：mock/（vite-plugin-mock 服务端拦截 + demo 客户端 import 复用）。
 *
 * 新增项目根目录别名时只需在这里加一行。
 */
export const PROJECT_ROOT_ALIASES = {
  '@mock': 'mock',
} as const

/**
 * vite resolve.alias 形态：bare → 绝对路径
 *
 * 用 process.cwd() 作为项目根（vitest 默认 cwd 是项目根；vite 启动时也是项目根）。
 * 不用 import.meta.url 是因为它在 vitest jsdom 环境下构造 file:// URL 会抛错。
 *
 * 合并策略：src 子目录优先（SRC_DIR_ALIASES） + 项目根目录（PROJECT_ROOT_ALIASES）兜底。
 * 同名冲突时 SRC 优先（更具体），如 @assets 不会被项目根同名目录覆盖。
 */
export function resolveSrcDirAliases(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [alias, sub] of Object.entries(SRC_DIR_ALIASES)) {
    map[alias] = path.resolve(process.cwd(), 'src', sub)
  }
  for (const [alias, sub] of Object.entries(PROJECT_ROOT_ALIASES)) {
    if (alias in map) continue // src 优先，跳过冲突
    map[alias] = path.resolve(process.cwd(), sub)
  }
  return map
}

/**
 * tsconfig paths 形态：
 *   "@"      → ["./src/*"]                     (catch-all)
 *   "@api"   → ["./src/api/index.ts"]          (bare)
 *   "@api/*" → ["./src/api/*"]                 (sub-path)
 *   "@mock"  → ["./mock/index.ts"]             (项目根目录)
 *   "@mock/*"→ ["./mock/*"]                    (项目根子路径)
 *
 * 与 vite alias 的区别：tsconfig paths 必须显式列 bare + /* 两条，否则 IDE 跳转不工作；
 * vite resolve 算法会自动追加 /index.ts 或 .ts，所以 bare 一条够用。
 */
export function generateTsconfigPaths(): Record<string, string[]> {
  const paths: Record<string, string[]> = {}
  for (const [alias, sub] of Object.entries(SRC_DIR_ALIASES)) {
    if (alias === '@') {
      paths['@/*'] = ['./src/*']
      continue
    }
    paths[alias] = sub ? [`./src/${sub}/index.ts`] : ['./src/index.ts']
    paths[`${alias}/*`] = [`./src/${sub}/*`]
  }
  for (const [alias, sub] of Object.entries(PROJECT_ROOT_ALIASES)) {
    if (alias in paths) continue // src 优先，跳过冲突
    paths[alias] = [`./${sub}/index.ts`]
    paths[`${alias}/*`] = [`./${sub}/*`]
  }
  return paths
}
