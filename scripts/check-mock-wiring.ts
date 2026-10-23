/**
 * mock 双接线一致性校验（架构审查健壮性项——消除「注释约定」漂移风险）。
 *
 * @vv/mock 有两份接线清单，历史上靠注释约定手工同步（mock/index.ts 头注 +
 * mockProdServer.ts @trigger），无工具强制，是全库最现实的漂移风险点：
 *   - dev 聚合入口：mock/index.ts（import auth/user/menu 模块的 default export）
 *   - prod 接线：mockProdServer.ts（内联 prodAuthMocks/prodDictMocks + import menu/user）
 *
 * 且权限码 MOCK_PERMISSIONS 在 auth.ts 与 mockProdServer.ts 两处字面量手工对齐
 * （两处无运行时共享）——增删权限码易漏改其一，致 dev/prod 行为分叉。
 *
 * 本脚本静态断言两处一致，接入 CI（ci.yml check-mock-wiring step）强制同步。
 *
 * 校验项：
 *   1. 模块清单一致：dev index.ts 聚合的具名模块，prod mockProdServer.ts 必须同样
 *      import（或显式内联覆盖并在本脚本登记豁免——auth/dict 走 prod 内联版属合理豁免，
 *      因其 rawResponse/路径参数 client 侧不支持，见 mockProdServer.ts 头注）
 *   2. MOCK_PERMISSIONS 单源：auth.ts 与 mockProdServer.ts 的权限码数组必须逐字一致
 *
 * 用法：node --experimental-strip-types scripts/check-mock-wiring.ts（exit 0 一致 / 1 漂移）
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const MOCK_SRC = path.join(REPO_ROOT, 'packages/mock/src')

/** 解析数组字面量文本为权限码数组（如 ['a','b'] → ['a','b']） */
function parseArrayLiteral(body: string): string[] {
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1] ?? '')
}

/** 从源里提取 MOCK_PERMISSIONS 权限码数组——兼容两种形态：
 *  ① `const MOCK_PERMISSIONS = [...]` 变量定义（mock/auth.ts）
 *  ② 内联在响应 `permissions: [...]` 字段（mockProdServer.ts 的 prodAuthMocks 内联版，
 *     不定义变量、直接把权限码写在 profile 响应的 permissions 字段）
 * 取两者首个命中的。 */
function extractPermissions(source: string): string[] {
  const varDef = source.match(/const MOCK_PERMISSIONS\s*=\s*\[([\s\S]*?)\]/)
  if (varDef) return parseArrayLiteral(varDef[1] ?? '')
  const inlineField = source.match(/permissions:\s*\[([\s\S]*?)\]/)
  if (inlineField) return parseArrayLiteral(inlineField[1] ?? '')
  return []
}

/** 从 import 语句提取具名本地模块引用（形如 `import x from './y'` 的 y） */
function parseLocalModuleImports(source: string): string[] {
  return [...source.matchAll(/import\s+\w+\s+from\s+'\.\/([\w-]+)'/g)].map((x) => x[1] ?? '')
}

let failures = 0

function check(ok: boolean, label: string, detail = ''): void {
  if (ok) {
    console.log(`✓ ${label}`)
  } else {
    console.error(`✗ ${label}${detail ? `：${detail}` : ''}`)
    failures++
  }
}

// ---- 读取双接线源 ----
const indexSrc = readFileSync(path.join(MOCK_SRC, 'index.ts'), 'utf-8')
const prodSrc = readFileSync(path.join(MOCK_SRC, 'mockProdServer.ts'), 'utf-8')

// ---- 校验 1：模块清单一致 ----
// dev 聚合模块（index.ts 的 './x' import）
const devModules = parseLocalModuleImports(indexSrc).sort()
// prod 接线 import 的模块（mockProdServer.ts 的 './x' import，排除 './dict-data' 数据引用）
const prodImportedModules = parseLocalModuleImports(prodSrc)
  .filter((m) => m !== 'dict-data')
  .sort()

// 合理豁免：auth/dict 在 prod 走内联版（prodAuthMocks/prodDictMocks），不 import auth.ts/dict.ts——
// 因 rawResponse（Set-Cookie 流）与路径参数 client 侧不支持（mockProdServer.ts 头注）。
// 故 prod 缺 auth/dict import 是设计使然，但 index.ts 里若有 auth/dict，prod 必须有对应内联（由校验 2 兜底权限码，这里登记豁免语义）。
const PROD_INLINE_EXEMPT = new Set(['auth', 'dict'])
const expectedProdImports = devModules.filter((m) => !PROD_INLINE_EXEMPT.has(m))

const missingInProd = expectedProdImports.filter((m) => !prodImportedModules.includes(m))
const unexpectedInProd = prodImportedModules.filter((m) => !devModules.includes(m))

check(
  missingInProd.length === 0,
  `[1] 模块清单一致：dev 聚合的 ${JSON.stringify(expectedProdImports)} 在 prod 均 import`,
  missingInProd.length ? `prod 缺 import：${missingInProd.join(', ')}` : ''
)
check(
  unexpectedInProd.length === 0,
  `[1] 模块清单一致：prod 无 dev 未聚合的意外模块`,
  unexpectedInProd.length
    ? `prod 多 import：${unexpectedInProd.join(', ')}（应同步登记进 dev index.ts 或确认豁免）`
    : ''
)

// ---- 校验 2：MOCK_PERMISSIONS 单源 ----
const authPerms = extractPermissions(readFileSync(path.join(MOCK_SRC, 'auth.ts'), 'utf-8'))
const prodPerms = extractPermissions(prodSrc)

check(
  authPerms.length > 0 && prodPerms.length > 0,
  `[2] MOCK_PERMISSIONS 两处均有定义`,
  authPerms.length
    ? prodPerms.length
      ? ''
      : 'prodAuthMocks 未定义 MOCK_PERMISSIONS'
    : 'auth.ts 未定义 MOCK_PERMISSIONS'
)
check(
  JSON.stringify(authPerms) === JSON.stringify(prodPerms),
  `[2] MOCK_PERMISSIONS 单源（auth.ts 与 prodAuthMocks 权限码一致）`,
  JSON.stringify(authPerms) !== JSON.stringify(prodPerms)
    ? `auth=[${authPerms.join(',')}] vs prod=[${prodPerms.join(',')}]`
    : ''
)

// ---- 汇总 ----
if (failures > 0) {
  console.error(
    `\n✗ mock 双接线漂移 ${failures} 处——同步 packages/mock/src/index.ts 与 mockProdServer.ts（见脚本头注）`
  )
  process.exit(1)
}
console.log('\n✓ mock 双接线一致（模块清单 + MOCK_PERMISSIONS）')
