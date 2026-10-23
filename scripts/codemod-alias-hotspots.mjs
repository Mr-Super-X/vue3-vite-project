// 一次性 codemod：别名深层热点收敛 → @vv/shared 包名（barrel 公共 API）
// 范围（架构审查登记的 3 个热点，不全量）：
//   - `@utils/safeAsync`     ×15（6 app 的 plugins/errorHandler.ts/.d.ts）
//   - `@store/modules/app`   ×10（admin/portal/docs 组件与守卫）
//   - `@store/modules/user`  ×7（admin/portal/auth/docs 组件与守卫）
//   - 顺带 vi.mock 模块说明符 ×4（语义即 import 说明符，不随行替换会导致 mock 失去拦截目标）
// 只替换带引号的模块说明符字面量 —— 注释 / 普通字符串（如 docs/store 注释里的裸路径）天然不受影响。
// 依据 CLAUDE.md §1.6.2 包消费约定：别名深层路径是 D4 平滑迁移的过渡态遗留，存量收敛、新增禁止。
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['apps', join('packages', 'ui', 'src')]

/** 精确带引号字面量替换，杜绝前缀误伤（@store/modules/app 不吞 appXxx） */
const RULES = [
  [/'@utils\/safeAsync'/g, "'@vv/shared'"],
  [/"@utils\/safeAsync"/g, '"@vv/shared"'],
  [/'@store\/modules\/app'/g, "'@vv/shared'"],
  [/"@store\/modules\/app"/g, '"@vv/shared"'],
  [/'@store\/modules\/user'/g, "'@vv/shared'"],
  [/"@store\/modules\/user"/g, '"@vv/shared"'],
]

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      yield* walk(full)
    } else if (/\.(ts|vue)$/.test(name)) {
      yield full
    }
  }
}

let filesChanged = 0
let replacements = 0
for (const scanDir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, scanDir))) {
    const before = readFileSync(file, 'utf8')
    let after = before
    let fileCount = 0
    for (const [pattern, replacement] of RULES) {
      after = after.replace(pattern, () => {
        fileCount++
        return replacement
      })
    }
    if (after !== before) {
      writeFileSync(file, after, 'utf8')
      filesChanged++
      replacements += fileCount
      console.log(`${fileCount}\t${file.slice(ROOT.length + 1)}`)
    }
  }
}
console.log(`\n${filesChanged} 文件 / ${replacements} 处替换`)
