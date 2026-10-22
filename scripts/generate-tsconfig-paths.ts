/**
 * tsconfig.app.json paths 生成器（v2，Monorepo）
 *
 * 用法：
 *   node --experimental-strip-types scripts/generate-tsconfig-paths.ts [--check]
 *
 * --check 模式：仅校验 paths 是否一致，不写入（check:aliases 复用本模式，单一逻辑来源）
 * 默认模式：读取目标 tsconfig.app.json 的 base + 其他字段，写入新的 paths 块
 *
 * 单一来源：packages/config/src/app-aliases.ts 的 createAppAliases
 * （vite resolve.alias 与 tsconfig paths 同一数据源，杜绝双维护漂移）
 *
 * v2 变更（P1-1）：
 *   - 数据源从 build/aliases.ts（已删）切换到 @vv/config 包源码
 *   - 目标 tsconfig 锚定脚本相对位置（不再依赖 cwd——P0-2 后 cwd=根而 tsconfig 在
 *     apps/admin，cwd 相对解析已失效一次，教训固化为此处绝对锚定）
 *   - 多 app 化（P5-1）时把 APP_ROOT 参数化遍历 apps/* 即可
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createAppAliases } from '../packages/config/src/app-aliases.ts'

/** 目标 app 根（绝对路径，锚定脚本位置而非 cwd） */
const APP_ROOT = fileURLToPath(new URL('../apps/admin', import.meta.url))
const TSCONFIG_APP = path.join(APP_ROOT, 'tsconfig.app.json')

interface TsConfig {
  extends?: string
  compilerOptions?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * vite alias（绝对路径）→ tsconfig paths（相对 tsconfig 所在目录的可移植形态）
 *
 * - '@' 只生成 '@/*'（catch-all）；bare '@' 无消费场景
 * - 其余别名生成 bare（指向 index.ts）+ '/*' 两条——tsconfig paths 必须显式列两条，
 *   否则 IDE 对 bare import（如 `from '@api'`）跳转不工作；vite resolve 会自动追加
 *   /index.ts 所以 alias 侧一条够用
 * - 指到 appRoot 之外的路径（如 @mock → 仓库根 mock/）输出 '../../mock/*' 上探形态，
 *   这是 P0-2 手修过的语义，生成器必须保留（被 check:aliases 锁定）
 */
export function aliasesToTsconfigPaths(
  aliases: Record<string, string>,
  appRoot: string
): Record<string, string[]> {
  const paths: Record<string, string[]> = {}
  for (const [alias, absDir] of Object.entries(aliases)) {
    const relRaw = path.relative(appRoot, absDir).split(path.sep).join('/')
    const rel = relRaw.startsWith('..') ? relRaw : `./${relRaw}`
    if (alias === '@') {
      paths['@/*'] = [`${rel}/*`]
      continue
    }
    paths[alias] = [`${rel}/index.ts`]
    paths[`${alias}/*`] = [`${rel}/*`]
  }
  return paths
}

/**
 * 生成最终的 tsconfig.app.json 内容（JSON 字符串）
 *
 * 输入：现有 tsconfig.app.json 解析对象 + 新的 paths 块
 * 输出：JSON 字符串，paths 数组紧凑单行（与手写原版格式一致），其他字段 2 空格缩进
 *
 * 为什么不直接用 JSON.stringify(..., null, 2)：
 *   - JSON.stringify 默认会把所有数组展开（每个元素一行），与手写原版的
 *     `"@/*": ["./src/*"]` 紧凑格式不一致——即使 paths 内容完全一样，hash 也会变
 *   - 这会导致 check:aliases 报"不一致"，且 pre-commit 永远会触发写入
 *
 * 策略：手动拼字符串，paths 数组单独用紧凑序列化，再嵌入到整体 2 空格缩进的结构里
 */
export function generateTsconfigContent(
  baseContent: TsConfig,
  paths: Record<string, string[]>
): string {
  const sortedPaths = Object.keys(paths)
    .sort()
    .reduce<Record<string, string[]>>((acc, key) => {
      acc[key] = paths[key]
      return acc
    }, {})

  const result: TsConfig = {
    ...baseContent,
    compilerOptions: {
      ...baseContent.compilerOptions,
      paths: sortedPaths,
    },
  }

  // 第一步：把整个 result 序列化为 2 空格缩进的字符串（paths 数组会被展开）
  const expanded = JSON.stringify(result, null, 2)

  // 第二步：把所有 paths 数组展开格式（`[\n  "..." \n]`）替换为紧凑格式（`["..."]`）
  // 匹配形如：`"<key>": [\n  "<value>"\n  ]` → `"<key>": ["<value>"]`
  // 用正则精确匹配 paths 块的数组值（紧跟在 `"paths": {` 之后到对应 `}` 之前）
  const compact = expanded.replace(
    /"(@\/?[^"]+|@[\w-]+)": \[\s*\n(\s*"[^"]+"(?:,\s*\n\s*"[^"]+")*)\s*\n\s*\]/g,
    (_match, key: string, items: string) => {
      // items 是展开的多行内容，提取后用逗号拼接为单行
      const flat = items.replace(/\s*\n\s*/g, ' ').trim()
      return `"${key}": [${flat}]`
    }
  )

  return compact + '\n'
}

/** 主流程：读取 → 计算 paths → 写入（或仅校验） */
function main(): void {
  const isCheck = process.argv.includes('--check')

  if (!existsSync(TSCONFIG_APP)) {
    console.error(`❌ ${TSCONFIG_APP} 不存在`)
    process.exit(1)
  }

  const existing = JSON.parse(readFileSync(TSCONFIG_APP, 'utf-8')) as TsConfig
  // legacyRoot 传 APP_ROOT 自身，与 create-vite-config 工厂消费形态一致
  // （packages/shared、packages/ui 落地前回落 app 旧位置）
  const expectedPaths = aliasesToTsconfigPaths(createAppAliases(APP_ROOT, APP_ROOT), APP_ROOT)
  const newContent = generateTsconfigContent(existing, expectedPaths)
  const currentContent = readFileSync(TSCONFIG_APP, 'utf-8')
  const newHash = createHash('sha256').update(newContent).digest('hex')
  const currentHash = createHash('sha256').update(currentContent).digest('hex')

  if (isCheck) {
    if (newHash === currentHash) {
      console.log('✅ tsconfig.app.json 与 @vv/config app-aliases 一致')
      process.exit(0)
    }
    console.error('❌ tsconfig.app.json 与 @vv/config app-aliases 不一致：')
    console.error('   跑 `pnpm generate:tsconfig-paths` 自动修复')
    process.exit(1)
  }

  // 默认模式：仅当内容变更时写入（避免 git diff 噪声）
  if (newHash === currentHash) {
    console.log('✅ tsconfig.app.json 无变更（hash 一致）')
    return
  }

  writeFileSync(TSCONFIG_APP, newContent)
  console.log('✅ tsconfig.app.json 已更新')
}

// 入口判断：用绝对路径比对，兼容 Windows / POSIX
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
const modulePath = fileURLToPath(import.meta.url)
if (entryPath && entryPath === modulePath) {
  main()
}
