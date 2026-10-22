/**
 * P1-3 K-1 codemod：'@/xxx' catch-all import → 精确别名
 *
 *  scope：apps/admin/src/** + apps/admin 根 *.ts（git ls-files 枚举）
 *  保护：'@/composables/useDialog|useConfirm|useLogout'（弹窗族留 admin，P1-4 随组件迁）
 *        '@/store/modules/tags-view' / '@/store/modules/router'（本就不在替换表内）
 *  只改引号包裹的 import 字符串，不动其他内容；CRLF 安全（替换串无换行）
 *
 * 用法：node scripts/codemod-p1-3-k1.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const DRY = process.argv.includes('--dry')

/** 弹窗族保护哨兵（替换前占位，结束后还原） */
const PROTECTED = ["'@/composables/useDialog'", "'@/composables/useConfirm'", "'@/composables/useLogout'"]
const SENTINEL = PROTECTED.map((_, i) => `'__P13_PROTECT_${i}__'`)

/** [匹配正则, 替换串, 规则名] —— 顺序敏感：store 精确匹配优先于通用前缀 */
const RULES = [
  [/'@\/store\/modules\/app'/g, "'@store/modules/app'", 'store/app'],
  [/'@\/store\/modules\/user'/g, "'@store/modules/user'", 'store/user'],
  [/'@\/store\/modules\/theme'/g, "'@store/modules/theme'", 'store/theme'],
  [/'@\/store\/modules\/dict'/g, "'@store/modules/dict'", 'store/dict'],
  [/'@\/api\//g, "'@api/", 'api'],
  [/'@\/utils\//g, "'@utils/", 'utils'],
  [/'@\/locales\//g, "'@locales/", 'locales'],
  [/'@\/enums\//g, "'@enums/", 'enums'],
  [/'@\/directives\//g, "'@directives/", 'directives'],
  [/'@\/types\//g, "'@types/", 'types'],
  [/'@\/composables\//g, "'@composables/", 'composables'],
]

// -z + core.quotePath=false：NUL 分隔 + 关闭非 ASCII 路径转义（中文文件名会被 git 加引号包裹）
const files = execSync(
  'git -c core.quotePath=false ls-files -z apps/admin/src apps/admin/*.ts apps/admin/*.vue apps/admin/*.mts',
  { encoding: 'utf8' },
)
  .split('\0')
  .filter((f) => /\.(ts|vue|mts)$/.test(f))

const stats = Object.fromEntries(RULES.map(([, , name]) => [name, 0]))
let touchedFiles = 0

for (const file of files) {
  let text = readFileSync(file, 'utf8')
  const original = text
  PROTECTED.forEach((p, i) => {
    text = text.split(p).join(SENTINEL[i])
  })
  for (const [re, to, name] of RULES) {
    text = text.replace(re, () => {
      stats[name]++
      return to
    })
  }
  PROTECTED.forEach((p, i) => {
    text = text.split(SENTINEL[i]).join(p)
  })
  if (text !== original) {
    touchedFiles++
    if (!DRY) writeFileSync(file, text)
  }
}

console.log(`files scanned: ${files.length}, touched: ${touchedFiles}${DRY ? ' (dry-run)' : ''}`)
for (const [name, count] of Object.entries(stats)) console.log(`  ${name}: ${count}`)
