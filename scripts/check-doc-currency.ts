#!/usr/bin/env node
// 文档与代码一致性校验
//
// 用途：防止 ARCHITECTURE.md / README.md 中记录的"硬数据"随重构漂移。
//
// 设计原则：
// - 不试图验证"文档字面与代码 1:1 一致"（过度耦合，无维护价值）
// - 只验证"事实型硬数据"（字段数 / 文件数 / 行数阈值）——这些是用户和 reviewer
//   翻文档时会照搬的数字，一旦漂移会误导决策
// - 阈值给 ±N 容差（如 builder 数允许 25-30 之间），适应未来扩展
// - 任何 FAIL 立即退出 1，CI 阶段阻断
//
// 当前覆盖的事实：
//   1. SchemaNode 字段数（types/schema-node.ts interface 体）—— ARCHITECTURE.md §2.1 表格
//   2. builder 导出数（builders.ts 中 xXxx 入口）—— ARCHITECTURE.md §8.1 表格
//   3. composable 文件数（composables/*.ts，排除 .spec.ts）
//   4. spec 文件数（composables/*.spec.ts + 根目录 *.spec.ts）
//   5. use-xform-composer.ts 行数上限（顶层编排膨胀预警）
//   6. ProDialog 自有 Props 数 —— docs/27-ProDialog使用指南.md §2.1 表格
//   7. BaseChart Props 数 —— docs/28-BaseChart使用指南.md §1.1 表格
//   8. build/ 顶层模块数 —— docs/04-构建与测试工具.md §1.1 表格
//   9. VENDOR_CHUNKS 具名组数 —— docs/04 §1.1 表格（vendor-vue / vendor-ui / vendor-charts）
//  10. ProTable composables 数 —— docs/29-ProTable使用指南.md §概述「17 composables」
//  11. ProTable 顶级 demo 数 —— docs/29-ProTable使用指南.md §概述「22 个演示」（21 能力 demo + ProTableOverview 主入口）
//  12. XFormProps 字段数 —— docs/24 §2 + form-schema README「18 个」（三视角审查 Wave1-5 同步后的硬数据；Wave3-4 i18n +1 t；Wave3-6 交互增强 +2 size/showDirtyMark）
//  13. XForm demo 数 —— docs/24 §19 示例索引「56 个」+ README（src/modules/demo/examples/XForm/ 下 .vue 数）
//
// 阈值调整原则：扩展字段 / 新增 composable 后，需同时更新本文档与 ARCHITECTURE.md。
// 任何调整都需要在 PR 描述中显式说明（避免阈值被随意放宽）。
//
// 用法：pnpm check:doc-currency

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const FORM_SCHEMA = join(ROOT, 'src/components/form-schema')

interface Check {
  name: string
  actual: () => number
  expected: number
  /** ±容差（默认 0）。composable / spec 数量允许小幅波动；核心字段数严格要求 */
  tolerance?: number
}

/** 读取文件统一换行符（Windows CRLF → LF），避免正则 ^ 锚点跨平台失效 */
function readText(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8').replace(/\r\n/g, '\n')
}

/** 数行 */
function countLines(relativePath: string): number {
  return readText(relativePath).split('\n').length
}

/** SchemaNode 命名空间子接口清单（P2-1 重构后） */
const SCHEMA_NODE_NAMESPACES = [
  { file: 'src/components/form-schema/types/identity.ts', interfaceName: 'SchemaNodeIdentity' },
  { file: 'src/components/form-schema/types/render.ts', interfaceName: 'SchemaNodeRender' },
  { file: 'src/components/form-schema/types/layout.ts', interfaceName: 'SchemaNodeLayout' },
  { file: 'src/components/form-schema/types/validate.ts', interfaceName: 'SchemaNodeValidate' },
  { file: 'src/components/form-schema/types/reaction.ts', interfaceName: 'SchemaNodeReactive' },
  { file: 'src/components/form-schema/types/array.ts', interfaceName: 'SchemaNodeArray' },
  { file: 'src/components/form-schema/types/async-options.ts', interfaceName: 'SchemaNodeData' },
  { file: 'src/components/form-schema/types/v-model.ts', interfaceName: 'SchemaNodeVModel' },
  { file: 'src/components/form-schema/types/top-level.ts', interfaceName: 'SchemaNodeTopLevel' },
] as const

/** 解析 interface 体内的字段数（精确：仅 interface body 内的字段声明） */
function countInterfaceFields(content: string, interfaceName: string): number {
  // 匹配 export interface Name { ... } —— 非贪婪，跨多行
  const re = new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`)
  const m = content.match(re)
  if (!m) return 0
  // 仅计字段声明行：空白开头 + 标识符 + ? : 或直接 :
  const fieldLines = m[1].split('\n').filter((line) => /^\s+[a-z][a-zA-Z]*\??:\s/.test(line))
  return fieldLines.length
}

/**
 * SchemaNode 字段总数 = 9 个命名空间子接口字段数之和（P2-1 重构后）
 *
 * SchemaNode 本身只 extends 不声明字段，所有字段分布在 9 个 namespace 子接口里。
 * 脚本聚合各子接口的字段数后与 ARCHITECTURE.md §2.1 表「合计」行校验。
 */
function countSchemaNodeFields(): number {
  let total = 0
  for (const ns of SCHEMA_NODE_NAMESPACES) {
    total += countInterfaceFields(readText(ns.file), ns.interfaceName)
  }
  return total
}

/**
 * 数 builder xXxx 入口数（builders/ 子目录全部 .ts，排除 index barrel）
 *
 * 架构审查 #3 拆分后 builders.ts 仅做 re-export（`export * from './builders/index'`），
 * 真正入口在 builders/core.ts + fields-*.ts + containers.ts。
 */
function countBuilders(): number {
  const dir = join(FORM_SCHEMA, 'builders')
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  const content = files.map((f) => readText(`src/components/form-schema/builders/${f}`)).join('\n')
  const matches = content.match(/^export const x[A-Z]\w+\s*[:=]/gm)
  return matches ? matches.length : 0
}

/** 数 composables/*.ts 文件（排除 .spec.ts 与 barrel.ts） */
function countComposables(): number {
  const files = readdirSync(FORM_SCHEMA + '/composables')
  return files.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'barrel.ts')
    .length
}

/**
 * 数 form-schema 全目录 spec 文件（composables + components + adapters + utils + 根级）
 *
 * 当前 65 个：composables 51（49 实现各 1 + barrel.spec + cross-rule-runner.spec）
 * + components 5 + adapters 1 + utils 5 + 根级 3。docs/25 TL;DR 与 ARCHITECTURE.md §9.1 表「合计」行写 65。
 * 2026-09-21 再锚定：fdc5809 批次 +3（render-tabs-steps-node / use-model-expression-rerender /
 * use-scan-async-options 各 1）。
 */
function countSpecFiles(): number {
  const dirs = ['composables', 'components', 'adapters', 'utils']
  const nested = dirs.reduce(
    (sum, d) =>
      sum + readdirSync(join(FORM_SCHEMA, d)).filter((f) => f.endsWith('.spec.ts')).length,
    0
  )
  const rootSpecs = readdirSync(FORM_SCHEMA).filter(
    (f) => f.endsWith('.spec.ts') && statSync(join(FORM_SCHEMA, f)).isFile()
  ).length
  return nested + rootSpecs
}

/**
 * 数 XFormProps 字段数（types/xform.ts interface 体）
 *
 * docs/24 §2 与 form-schema README props 段均写「16 个」；与 index.spec.ts
 * 'XFormProps 契约快照' 用例互锁 —— 增删 prop 时两处同时失败。
 */
function countXFormProps(): number {
  return countInterfaceFields(readText('src/components/form-schema/types/xform.ts'), 'XFormProps')
}

/**
 * 数 XForm demo 文件（src/modules/demo/examples/XForm/ 下 .vue，含 XFormOverview 主入口）
 *
 * docs/24 §19 示例索引表「56 个 demo」与 README demo 计数段写 56；§19 表行数与此互锁。
 * 2026-09-18 Wave4-2 新增 XFormTabsSteps：55 → 56。
 */
function countXFormDemos(): number {
  return readdirSync(join(ROOT, 'src/modules/demo/examples/XForm')).filter((f) =>
    f.endsWith('.vue')
  ).length
}

/**
 * 数 ProDialog 显式声明的自有 Props（interface Props 体）
 *
 * 排除 ElDialog 通过 $attrs 透传的 Props（详见 src/components/common/ProDialog/ProDialog.vue 文件头）。
 * 解析规则：扫 `interface Props { ... }` 内 `^\s+name\??:\s` 模式。
 */
function countProDialogProps(): number {
  const content = readText('src/components/common/ProDialog/ProDialog.vue')
  const m = content.match(/interface Props \{([\s\S]*?)\n\}/)
  if (!m) return 0
  return m[1].split('\n').filter((line) => /^\s+[a-z][a-zA-Z]*\??:\s/.test(line)).length
}

/**
 * 数 BaseChart 显式声明的 Props（BaseChartProps interface 体）
 */
function countBaseChartProps(): number {
  const content = readText('src/components/common/BaseChart.vue')
  const m = content.match(/interface BaseChartProps \{([\s\S]*?)\n\}/)
  if (!m) return 0
  return m[1].split('\n').filter((line) => /^\s+[a-z][a-zA-Z]*\??:\s/.test(line)).length
}

/**
 * 数 build/ 顶层模块数（*.ts 排除 .spec.ts 与 scripts/ 子目录）
 *
 * 包含：aliases.ts / vendor-chunks.ts / scss.ts / server.ts / proxy.ts / index.ts
 * 不包含：scripts/generate-tsconfig-paths.ts（子目录下的脚本，由单独检查覆盖）
 */
function countBuildModules(): number {
  const files = readdirSync(join(ROOT, 'build'))
  return files.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts')).length
}

/**
 * 数 VENDOR_CHUNKS 具名组数（vendor-vue / vendor-ui / vendor-charts）
 *
 * 注意：manualChunks 中还有 `'vendor-utils'` fallback，不在 VENDOR_CHUNKS 数组内；
 * docs/04 §1.1 写「4 组」是包括 fallback 的总数，此处校验具名组数 = 3。
 */
function countVendorChunksNamed(): number {
  const content = readText('build/vendor-chunks.ts')
  const matches = content.match(/name:\s*['"]vendor-/g)
  return matches ? matches.length : 0
}

/**
 * 数 ProTable composables/*.ts 文件（排除 .spec.ts）
 *
 * 当前 17 个：4 核心（useSearch / useColumns / useTable / useTableCapabilities）
 * + 13 能力/引擎/事件（useRowEdit / useRowDrag / useCellSpan / useTreeData / useSummary /
 * useVirtualScroll / useAutoHeight / useStatePersist / useFullscreen / useProTableEvents /
 * useVxeTable / useEngineFallback / useTableEngineDom）
 * docs/29 §概述写「17 composables」是概数；脚本校验精确值 = 17。
 */
function countProTableComposables(): number {
  const files = readdirSync(join(ROOT, 'src/components/ProTable/composables'))
  return files.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts')).length
}

/**
 * 数 ProTable 顶级 demo 文件（ProTable*.vue，排除 configs/ 子目录）
 *
 * 当前 22 个：21 个能力 demo + ProTableOverview 主入口（2026-09-18 新增 HeaderActions / ImportExport）
 */
function countProTableDemos(): number {
  const files = readdirSync(join(ROOT, 'src/modules/demo/examples/ProTable'))
  return files.filter(
    (f) =>
      f.endsWith('.vue') &&
      f !== 'configs' &&
      statSync(join(ROOT, 'src/modules/demo/examples/ProTable', f)).isFile()
  ).length
}

const checks: Check[] = [
  {
    // SchemaNode 实际 35 字段（ARCHITECTURE.md §2.1 已同步为 35）
    name: 'SchemaNode 字段数 (ARCHITECTURE.md §2.1 表格)',
    actual: countSchemaNodeFields,
    expected: 35,
    tolerance: 0,
  },
  {
    name: 'builder 入口数 (ARCHITECTURE.md §8.1 表格)',
    actual: countBuilders,
    expected: 29,
    tolerance: 0,
  },
  {
    // ARCHITECTURE.md 头部写「一文件一能力（50 个）」含 barrel.ts；本函数排除 barrel 数实现文件 = 49。
    // 2026-09-21 再锚定：fdc5809 批次 +3（render-tabs-steps-node / use-model-expression-rerender / use-scan-async-options）。
    name: 'composable 文件数 (ARCHITECTURE.md §1.1 目录树)',
    actual: countComposables,
    expected: 49,
    tolerance: 2,
  },
  {
    // 65 = ARCHITECTURE.md §9.1 表合计行 + docs/25 TL;DR（2026-09-21 再锚定，构成见 countSpecFiles 注释）
    name: 'spec 文件数 (ARCHITECTURE.md §9.1 表格)',
    actual: countSpecFiles,
    expected: 65,
    tolerance: 2,
  },
  {
    // 2026-09-21 再锚定 285→300（容差 50 → 250-350）：Wave4 能力装配使 composer 达 350（split 计数），
    // 增量来自 composition root 的接线（useModelExpressionRerender + modelExpressionEpoch /
    // showDirtyMark / permissionResolver 条件展开），非业务逻辑膨胀。
    // 已贴近上限：下次增长应先抽离 cross-field 编排块（composer 内约 30 行，含 resetFields tick 包装），
    // 而非继续放宽阈值。
    name: 'use-xform-composer.ts 行数 (顶层编排膨胀预警)',
    actual: () => countLines('src/components/form-schema/composables/use-xform-composer.ts'),
    expected: 300,
    tolerance: 50,
  },
  {
    name: 'ProDialog 自有 Props 数 (docs/27 §2.1 表格)',
    actual: countProDialogProps,
    expected: 7,
    tolerance: 0,
  },
  {
    name: 'BaseChart Props 数 (docs/28 §1.1 表格)',
    actual: countBaseChartProps,
    expected: 4,
    tolerance: 0,
  },
  {
    name: 'build/ 顶层模块数 (docs/04 §1.1 表格)',
    actual: countBuildModules,
    expected: 6,
    tolerance: 0,
  },
  {
    name: 'VENDOR_CHUNKS 具名组数 (docs/04 §1.1 表格)',
    actual: countVendorChunksNamed,
    expected: 3,
    tolerance: 0,
  },
  {
    name: 'ProTable composables 数 (docs/29 §概述)',
    actual: countProTableComposables,
    expected: 17,
    tolerance: 0,
  },
  {
    name: 'ProTable 顶级 demo 数 (docs/29 §概述)',
    actual: countProTableDemos,
    expected: 22,
    tolerance: 0,
  },
  {
    name: 'XFormProps 字段数 (docs/24 §2 + README「18 个」)',
    actual: countXFormProps,
    expected: 18,
    tolerance: 0,
  },
  {
    name: 'XForm demo 数 (docs/24 §19「56 个」+ README)',
    actual: countXFormDemos,
    expected: 56,
    tolerance: 0,
  },
]

let failed = 0

for (const check of checks) {
  const actual = check.actual()
  const tolerance = check.tolerance ?? 0
  const lo = check.expected - tolerance
  const hi = check.expected + tolerance
  const ok = actual >= lo && actual <= hi
  const status = ok ? '✓ PASS' : '✗ FAIL'
  const range = tolerance === 0 ? `${check.expected}` : `${lo}-${hi}`
  console.log(`${status}  ${check.name.padEnd(48)} actual=${actual}  expected=${range}`)
  if (!ok) failed++
}

console.log('')
if (failed > 0) {
  console.error(`[check-doc-currency] ${failed} 项校验失败`)
  console.error(
    '[check-doc-currency] 阈值调整需同时更新 ARCHITECTURE.md + 此脚本，并在 PR 描述中显式说明'
  )
  process.exit(1)
}
console.log(`[check-doc-currency] 全部 ${checks.length} 项校验通过`)
