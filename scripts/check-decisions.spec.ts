/**
 * check-decisions 单测（node:test runner）——决策台账机检的假阳性守护（/autoplan R3-G1）。
 *
 * 业务背景：DECISIONS.md 是仓内决策唯一事实源，解析正则/状态机漂移会让机检静默失效
 * （全绿 ≠ 台账健康，同 R2-E8「CLI 全绿无法区分真一致与解析退化为空集」论证）。
 * 本 spec 守护：parseDecisions 表解析 + validateDecisions 三条纪律
 * （状态机合法性 / 待实施必须登记 TODOS / 已落地锚点必须存在）。
 *
 * 运行：pnpm test:check-scripts
 * @see scripts/check-decisions.ts —— 被测实现
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseDecisions, validateDecisions } from './check-decisions.ts'

const FAKE_TODOS = '# TODOS\n\n| R3-E4 | xxx |\n| R3-D1 | yyy |\n'

const deps = (todos = FAKE_TODOS, existing: string[] = ['scripts/x.ts']) => ({
  todosContent: todos,
  fileExists: (p: string) => existing.includes(p),
})

// ── parseDecisions：Markdown 表解析 ────────────────────────────

const SAMPLE = `
| 决策 ID | 内容 | 来源 | 状态 | 验证锚点 |
|---------|------|------|------|----------|
| R3-E1 | 网关入 CI | /autoplan R3 | 已落地 | .github/workflows/ci.yml |
| R3-E4 | 安全 headers | /autoplan R3 | 待实施 | — |
| R3-演进-1 | 触发线 | /autoplan R3 | 登记 | — |
| P5-修正 | 重验条款 | 前提门 D2 | 登记 | — |
`

test('parseDecisions：解析全部数据行（含连字符 ID），跳过表头与分隔行', () => {
  const rows = parseDecisions(SAMPLE)
  assert.equal(rows.length, 4)
  assert.deepEqual(rows[0], {
    id: 'R3-E1',
    content: '网关入 CI',
    source: '/autoplan R3',
    status: '已落地',
    anchor: '.github/workflows/ci.yml',
  })
  assert.equal(rows[1]!.anchor, '—')
  assert.equal(rows[3]!.id, 'P5-修正')
})

test('parseDecisions：0 数据行 → 空数组（结构性问题由 validate 的 0 行检查兜）', () => {
  assert.deepEqual(parseDecisions('# 只有标题\n\n没有表\n'), [])
})

// ── validateDecisions：三条台账纪律 ────────────────────────────

test('台账纪律：合法混合状态 → 无错误', () => {
  const rows = parseDecisions(SAMPLE)
  assert.deepEqual(validateDecisions(rows, deps(FAKE_TODOS, ['.github/workflows/ci.yml'])), [])
})

test('台账纪律：待实施未登记 TODOS → 报错（R2 事故形态机检网）', () => {
  const rows = parseDecisions(SAMPLE)
  // 空 TODOS → SAMPLE 中唯一「待实施」R3-E4 失去登记，必须被机检捕获
  const errors = validateDecisions(rows, deps('# TODOS 空表\n', ['.github/workflows/ci.yml']))
  assert.ok(errors.some((e) => e.includes('R3-E4') && e.includes('TODOS')))
})

test('台账纪律：待实施已登记 TODOS → 不报该条', () => {
  const only = `
| 决策 ID | 内容 | 来源 | 状态 | 验证锚点 |
|---------|------|------|------|----------|
| R3-E4 | 安全 headers | /autoplan R3 | 待实施 | — |
`
  assert.deepEqual(validateDecisions(parseDecisions(only), deps()), [])
})

test('台账纪律：非法状态 → 报错且跳过后续检查', () => {
  const bad = `
| 决策 ID | 内容 | 来源 | 状态 | 验证锚点 |
|---------|------|------|------|----------|
| R3-X9 | 某决策 | /autoplan R3 | 进行中 | — |
`
  const errors = validateDecisions(parseDecisions(bad), deps())
  assert.ok(errors.some((e) => e.includes('进行中') && e.includes('状态机')))
})

test('台账纪律：已落地锚点为 — → 报错', () => {
  const noAnchor = `
| 决策 ID | 内容 | 来源 | 状态 | 验证锚点 |
|---------|------|------|------|----------|
| R3-G1 | 台账机检 | /autoplan R3 | 已落地 | — |
`
  const errors = validateDecisions(parseDecisions(noAnchor), deps())
  assert.ok(errors.some((e) => e.includes('验证锚点为「—」')))
})

test('台账纪律：已落地锚点文件不存在 → 状态谎报报错', () => {
  const rows = parseDecisions(SAMPLE)
  const errors = validateDecisions(rows, deps(FAKE_TODOS, ['other/file.ts']))
  assert.ok(errors.some((e) => e.includes('.github/workflows/ci.yml') && e.includes('不存在')))
})

test('台账纪律：0 行 → 结构性报错（防解析退化空集静默全绿）', () => {
  const errors = validateDecisions([], deps())
  assert.ok(errors.some((e) => e.includes('0 条决策')))
})
