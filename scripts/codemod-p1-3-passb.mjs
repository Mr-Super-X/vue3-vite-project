/**
 * ⚠️ 一次性迁移脚本（P1-3 已执行完毕），勿再运行；保留供历史追溯
 *
 * P1-3 Pass B codemod：packages/shared 包内别名 import → 相对路径 + .ts 扩展名
 *
 *  scope：packages/shared/src/**（仅 .ts）
 *  规则：'@utils/x' '@api/x' '@enums/x' '@types/x' '@composables/x' '@store/modules/x'
 *        → 相对该文件位置的 src 内路径（带 .ts）
 *  跳过：注释行（行首 * 或 //）——docstring 里的 '@api/xxx' 是消费方用法示例，保持别名形态
 *
 * 用法：node scripts/codemod-p1-3-passb.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

const DRY = process.argv.includes('--dry')
const SRC = 'packages/shared/src'

const files = execSync(`git -c core.quotePath=false ls-files -z ${SRC}`, { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f.endsWith('.ts'))

/** 别名前缀 → src 内目标子目录 */
const ALIAS_DIRS = ['utils', 'api', 'enums', 'types', 'composables', 'locales', 'directives']

let touchedFiles = 0
let total = 0

for (const file of files) {
  const fileDir = path.posix.dirname(file)
  const lines = readFileSync(file, 'utf8').split('\n')
  let changed = false

  const out = lines.map((line) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return line

    return line.replace(
      /'@(utils|api|enums|types|composables|locales|directives)\/([^']+)'|'@store\/modules\/([^']+)'/g,
      (whole, aliasDir, sub, storeMod) => {
        const targetSub = aliasDir ? `${aliasDir}/${sub}` : `store/modules/${storeMod}`
        const absTarget = `${SRC}/${targetSub}`
        let rel = path.posix.relative(fileDir, absTarget)
        if (!rel.startsWith('.')) rel = `./${rel}`
        changed = true
        total++
        return `'${rel}.ts'`
      }
    )
  })

  if (changed) {
    touchedFiles++
    if (!DRY) writeFileSync(file, out.join('\n'))
  }
}

console.log(`files scanned: ${files.length}, touched: ${touchedFiles}, imports rewritten: ${total}${DRY ? ' (dry-run)' : ''}`)
