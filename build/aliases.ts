import path from 'node:path'

/**
 * src 下子目录别名映射（单一来源）
 *
 * 新增子目录时只需在这里加一行，生成器会自动同步到 tsconfig.app.json
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
 * vite resolve.alias 形态：bare → src/<dir> 绝对路径
 *
 * 用 process.cwd() 作为项目根（vitest 默认 cwd 是项目根；vite 启动时也是项目根）。
 * 不用 import.meta.url 是因为它在 vitest jsdom 环境下构造 file:// URL 会抛错。
 */
export function resolveSrcDirAliases(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [alias, sub] of Object.entries(SRC_DIR_ALIASES)) {
    map[alias] = path.resolve(process.cwd(), 'src', sub)
  }
  return map
}

/**
 * tsconfig paths 形态：
 *   "@"      → ["./src/*"]                     (catch-all)
 *   "@api"   → ["./src/api/index.ts"]          (bare)
 *   "@api/*" → ["./src/api/*"]                 (sub-path)
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
  return paths
}
