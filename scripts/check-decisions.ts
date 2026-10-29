#!/usr/bin/env node
// 审查决策台账机检（/autoplan Round 3 R3-G1，2026-10-29）
//
// 业务背景：Round 2 实证「审查决策静默遗漏」——/autoplan 各轮产出的决策审计档案存于
// 仓外 ~/.gstack，仓内只靠 TODOS.md 人工对账，结果 10 项 DX 决策 3 项未落地 + 1 项部分
// 落地且全部未被捕获（Round 3 双代理独立命中）。本脚本把对账规则机检化：
//   1. DECISIONS.md 是唯一决策事实源（状态机：已落地/待实施/登记/关闭）
//   2. 「待实施」决策必须同时出现在 TODOS.md（防「既未落地也未登记」的 R2 事故形态）
//   3. 「已落地」决策必须带验证锚点且锚点文件存在（防状态谎报）
//   4. 表结构漂移（缺列/无法解析任何行）= 结构性报错，非静默空集
//
// 用法：pnpm check:decisions
// 失败退出码：1（CI 阶段阻断）

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')

/** 合法状态机（DECISIONS.md 台账纪律第 1 条） */
export const ALLOWED_STATUSES = ['已落地', '待实施', '登记', '关闭'] as const

export interface DecisionRow {
  id: string
  content: string
  source: string
  status: string
  anchor: string
}

/**
 * 解析 DECISIONS.md 决策表（| 决策 ID | 内容 | 来源 | 状态 | 验证锚点 |）。
 * 只收数据行（首单元格形如 `R3-E1` / `P5-修正` 的 ID），跳过分隔行与表头。
 */
export function parseDecisions(content: string): DecisionRow[] {
  const rows: DecisionRow[] = []
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length < 5) continue
    const [id, desc, source, status, anchor] = cells as [string, string, string, string, string]
    // ID 允许 ASCII/CJK/数字/连字符（台账含 R3-演进-1、P5-修正 这类中英混合 ID）；
    // 分隔行（纯 -）与表头（含空格）均不匹配
    if (!/^[A-Za-z0-9一-鿿][\w一-鿿-]*$/.test(id)) continue
    rows.push({ id, content: desc, source, status, anchor })
  }
  return rows
}

/**
 * 台账纪律校验（纯函数；fileExists 注入以便测试）：
 * - 状态不在状态机 → 报错
 * - 待实施/部分落地 但 TODOS.md 无同 ID → 报错（R2 事故形态的机检网）
 * - 已落地 但锚点为 `—` 或锚点文件不存在 → 报错
 */
export function validateDecisions(
  rows: DecisionRow[],
  deps: { todosContent: string; fileExists: (repoRelativePath: string) => boolean }
): string[] {
  const errors: string[] = []
  if (rows.length === 0) {
    errors.push('DECISIONS.md 解析出 0 条决策——表结构漂移（缺列/格式改动），非「真无决策」')
    return errors
  }
  for (const row of rows) {
    if (!ALLOWED_STATUSES.includes(row.status as (typeof ALLOWED_STATUSES)[number])) {
      errors.push(
        `${row.id} 状态「${row.status}」不在状态机（${ALLOWED_STATUSES.join('/')}）→ 改为合法状态或更新 ALLOWED_STATUSES`
      )
      continue
    }
    if (row.status === '待实施' && !deps.todosContent.includes(row.id)) {
      errors.push(
        `${row.id}（${row.content}）状态「待实施」但 TODOS.md 无同 ID → 补登记或改状态（R2 静默遗漏形态的机检网）`
      )
    }
    if (row.status === '已落地') {
      if (row.anchor === '—' || row.anchor === '') {
        errors.push(`${row.id} 状态「已落地」但验证锚点为「—」→ 补仓内相对路径锚点`)
      } else if (!deps.fileExists(row.anchor)) {
        errors.push(`${row.id} 验证锚点 ${row.anchor} 不存在 → 状态谎报或锚点路径失效`)
      }
    }
  }
  return errors
}

export function main(): void {
  const decisionsPath = resolve(ROOT, 'DECISIONS.md')
  if (!existsSync(decisionsPath)) {
    console.error('✖ DECISIONS.md 不存在——决策台账被删除？本检查即为其存在性守护')
    process.exit(1)
  }
  const todosPath = resolve(ROOT, 'TODOS.md')
  const rows = parseDecisions(readFileSync(decisionsPath, 'utf-8'))
  const errors = validateDecisions(rows, {
    todosContent: existsSync(todosPath) ? readFileSync(todosPath, 'utf-8') : '',
    fileExists: (p) => existsSync(resolve(ROOT, p)),
  })

  console.log(`━━━ 决策台账机检（${rows.length} 条决策）━━━`)
  const landed = rows.filter((r) => r.status === '已落地').length
  const pending = rows.filter((r) => r.status === '待实施').length
  const registered = rows.filter((r) => r.status === '登记').length
  console.log(`✓ 状态分布：已落地 ${landed} / 待实施 ${pending} / 登记 ${registered}`)
  if (errors.length === 0) {
    console.log('✓ 台账纪律全过（待实施均登记 TODOS、已落地锚点均存在）')
  } else {
    for (const message of errors) console.error(`✖ ${message}`)
    console.error('')
    console.error('修复指引：')
    console.error('  [状态] 非法状态 → 改为 已落地/待实施/登记/关闭')
    console.error('  [待实施] TODOS 无 ID → TODOS.md 补登记，或该决策已落地则改状态+补锚点')
    console.error('  [已落地] 锚点缺失/失效 → 补真实锚点路径；未真落地则改回「待实施」')
    console.error(`✖ 共 ${errors.length} 个错误`)
    process.exit(1)
  }
}

// CLI 守卫：被 import 时不执行（与 generate-declisions 同一 realpath 模式——
// Windows 下 import.meta.url(file:///D:/…) 与 argv 路径(D:\…) 直接字符串比对永不命中，
// R3-G1 实施期实证：错误比对曾致 main() 静默不跑、exit 0 空通过）
const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main()
}
