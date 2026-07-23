#!/usr/bin/env node
// 模块脚手架
//
// 用途：为新业务模块生成最简骨架，省去手动建 5 处目录与同步 2 处源头。
//   1. 验证 kebab-case 命名
//   2. 创建 src/modules/<name>/{views,routes,store,apis,components} 5 个子目录 + 6 个产物文件
//      ─ views/Index.vue（默认 layout 业务页）
//      ─ routes/index.ts（默认 layout 包裹 + 自动注册）
//      ─ store/index.ts（Setup Store 骨架）
//      ─ apis/index.ts（模块本地 API 层，与 src/api/modules/<name>.ts 互斥）
//      ─ index.ts（对外接口 stub）
//      ─ components/.gitkeep（占位，让 components/ 目录被 git 跟踪）
//   3. 自动追加 RouteName 到 src/router/types.ts 的联合类型（不再需在 3 处源头手动同步）
//   4. 输出下一步建议（mock / check:routes / 权限码）
//
// 用法：pnpm new-module <kebab-case-name>
// 例如：pnpm new-module orders     →  src/modules/orders/ + 类型中追加 'Orders'
//
// 默认生成 default layout（业务页通用）。blank layout（登录页/注册页）请参考
// src/modules/auth/routes/index.ts 手工写。

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const MODULES_DIR = resolve(ROOT, 'src/modules')
const TYPES_PATH = resolve(ROOT, 'src/router/types.ts')

function kebabToPascal(s: string): string {
  return s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())
}

/**
 * 解析并校验 argv 输入。错误时 process.exit(1)。
 * @returns 规范化后的 kebab-case 名 + PascalCase 名
 */
function parseNameArg(argv: string[]): { name: string; pascal: string } {
  const name = argv[2]
  if (!name) {
    console.error('✖ 用法: pnpm new-module <kebab-case-name>')
    console.error('  示例: pnpm new-module orders')
    process.exit(1)
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`✖ 模块名必须是 kebab-case：以小写字母开头，仅含小写字母/数字/短横线`)
    console.error(`  当前: "${name}"`)
    console.error(`  正确示例: orders  /  user-profile  /  report-export`)
    process.exit(1)
  }
  return { name, pascal: kebabToPascal(name) }
}

/** 在模块目录创建 views/components/routes/store/apis 子目录。 */
function createModuleDirs(moduleDir: string): void {
  mkdirSync(join(moduleDir, 'views'), { recursive: true })
  mkdirSync(join(moduleDir, 'components'), { recursive: true })
  mkdirSync(join(moduleDir, 'routes'), { recursive: true })
  mkdirSync(join(moduleDir, 'store'), { recursive: true })
  mkdirSync(join(moduleDir, 'apis'), { recursive: true })
}

/** views/Index.vue：BEM 骨架 + "本页面由 new-module 生成"提示。 */
function buildIndexVue(name: string, pascal: string): string {
  return `<script setup lang="ts">
// 模块入口视图
// 真实场景下常替换为 AsyncState + useRequest 的列表/表单/详情模板
// 参考 src/modules/dashboard/views/Index.vue 了解 el-row + el-card 基本骨架
</script>

<template>
  <div :class="bem.b()">
    <h1 :class="bem.e('title')">${pascal} 首页</h1>
    <p :class="bem.e('hint')">本页面由 <code>pnpm new-module ${name}</code> 生成，请按需扩展。</p>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins/bem' as *;

@include b('${name}') {
  padding: 16px;

  &__title {
    margin: 0 0 8px;
    font-size: var(--font-size-xl, 20px);
    font-weight: var(--font-weight-semibold, 600);
  }

  &__hint {
    color: var(--text-secondary, #666);

    code {
      padding: 2px 6px;
      background: var(--code-bg, rgba(0, 0, 0, 0.05));
      border-radius: 4px;
      font-family: var(--font-family-mono, monospace);
    }
  }
}
</style>
`
}

/** routes/index.ts：default layout + 单一 children（多级菜单参考 orders 模块）。 */
function buildRoutesTs(name: string, pascal: string): string {
  return `// ${name} 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。
// 新增/修改路由细节参考 docs/07-路由模块设计.md。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/${name}',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: '',
        name: '${pascal}',
        component: () => import('../views/Index.vue'),
        meta: {
          title: '${pascal} 首页',
          titleKey: 'menu.${name}',
          icon: 'document',
          requiresAuth: true,
          // permissions: ['${name}:view'], // 可选：路由级权限，未配置则所有人可访问
        },
      },
      // 多级菜单示例：children 嵌套（参考 src/modules/orders/routes/index.ts）
    ],
  },
]

export default routes
`
}

/** store/index.ts：Setup Store 骨架（含 draft/setDraft/clearDraft 示例）。 */
function buildStoreTs(name: string, pascal: string): string {
  return `import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * ${pascal} 模块私有状态。
 *
 * 命名约束：首参数 \`'module-${name}'\` 必须全局唯一，否则 Pinia 启动时会冲突。
 * 私有状态不与跨模块共享，跨模块通信请走"模块对外接口"（本目录的 ../index.ts）。
 */
export const use${pascal}Store = defineStore('module-${name}', () => {
  // 示例：列表查询条件 / 详情缓存 / 表单草稿
  const draft = ref<Record<string, unknown>>({})

  function setDraft(key: string, value: unknown): void {
    draft.value[key] = value
  }

  function clearDraft(): void {
    draft.value = {}
  }

  return { draft, setDraft, clearDraft }
})
`
}

/** index.ts：模块对外接口 stub。 */
function buildModuleIndexTs(name: string, pascal: string): string {
  return `// ${pascal} 模块对外接口（公开 API）。
//
// 模块对外只暴露 \`modules/${name}/index.ts\`（本文件）。
// 其他模块需要引用本模块时，必须只 import 本文件，不得越级 import 内部文件。
//
// 当前模块无对外 API；按业务需要导出即可，例如：
//   export { use${pascal}Store } from './store'
//   export { ${name}Api } from './apis'
//   export type { ${pascal}Item } from './apis'

export {}
`
}

/**
 * apis/index.ts：模块本地 API 层（互斥于 src/api/modules/<name>.ts）。
 *
 * 与 src/api/modules/<name>.ts 的取舍：
 *   - 仅本模块使用（强内聚）：放本目录（脚手架默认，强烈推荐新模块用此）
 *   - 跨模块共享（多页面共用同一接口）：迁到 src/api/modules/<name>.ts
 *
 * 自动应用 http.ts 的 14 个基建（401 refresh、retry、cache、abort、pageAdapter 等）。
 */
function buildApisIndexTs(name: string, pascal: string): string {
  return `// ${pascal} 模块的 API 层（模块内强内聚版本）。
//
// 与 src/api/modules/${name}.ts 互斥：
//   - 仅本模块使用（强内聚）→ 放本目录（脚手架默认）
//   - 跨模块共享            → 迁到 src/api/modules/${name}.ts
//
// 自动应用 http.ts 基建：401 refresh、retry、cache、abort、pageAdapter 等。

import { request } from '@/api/http'

/** 业务实体类型定义（按需扩展） */
export interface ${pascal}Item {
  id: number
  name: string
  // createdAt?: string
  // status?: 'active' | 'inactive'
}

/** 列表查询参数 */
export interface ${pascal}ListParams {
  page: number
  pageSize: number
  keyword?: string
}

/** 分页响应（pageAdapter 转换后的统一结构） */
export interface ${pascal}ListResponse {
  list: ${pascal}Item[]
  total: number
}

/**
 * ${name} API 命名空间。
 *
 * 命名约定：函数名小驼峰，对象名 \`\${name}Api\`（与项目 src/api/modules/*.ts 风格一致）。
 * 全部走 \`request<T>()\`，由 http.ts 拦截器链统一注入 token / 401 retry / 缓存 / 分页适配等。
 */
export const ${name}Api = {
  /** 列表查询（自动分页转换 + GET 缓存 + 401 自动 refresh 重试） */
  getList: (params: ${pascal}ListParams) =>
    request<${pascal}ListResponse>({
      url: '/${name}/list',
      method: 'get',
      params,
      usePageAdapter: true,
    }),

  // 示例：详情 / 创建 / 更新 / 删除（按需启用）
  // getById: (id: number) =>
  //   request<${pascal}Item>({ url: \`/\${'${name}'}/\${id}\`, method: 'get' }),
  //
  // create: (payload: Omit<${pascal}Item, 'id'>) =>
  //   request<${pascal}Item>({ url: '/${name}', method: 'post', data: payload }),
  //
  // update: (id: number, payload: Partial<${pascal}Item>) =>
  //   request<${pascal}Item>({ url: \`/\${'${name}'}/\${id}\`, method: 'put', data: payload }),
  //
  // remove: (id: number) =>
  //   request<void>({ url: \`/\${'${name}'}/\${id}\`, method: 'delete' }),
}
`
}

/** 串接：建目录 + 按映射写文件 + 打印成功行。 */
function writeSkeleton(name: string, pascal: string, moduleDir: string): void {
  createModuleDirs(moduleDir)

  const files: ReadonlyArray<readonly [string, string]> = [
    ['views/Index.vue', buildIndexVue(name, pascal)],
    ['routes/index.ts', buildRoutesTs(name, pascal)],
    ['store/index.ts', buildStoreTs(name, pascal)],
    ['apis/index.ts', buildApisIndexTs(name, pascal)],
    ['index.ts', buildModuleIndexTs(name, pascal)],
    ['components/.gitkeep', ''],
  ]

  for (const [rel, content] of files) {
    writeFileSync(join(moduleDir, rel), content, 'utf-8')
    console.log(`  ✓ ${rel}`)
  }
}

/**
 * 在 src/router/types.ts 的 RouteName 联合类型末尾追加新条目。
 * 幂等：重复跑不会重复追加（同名存在则跳过并打日志）。
 */
function syncRouteName(pascal: string): void {
  const typesContent = readFileSync(TYPES_PATH, 'utf-8').replace(/\r\n/g, '\n')
  const lines = typesContent.split('\n')
  let inRouteName = false
  let lastPipeIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*export type RouteName\s*=/.test(line)) {
      inRouteName = true
      continue
    }
    if (!inRouteName) continue
    if (/^\s*$/.test(line)) break
    if (/^\s*\|\s*'/.test(line)) lastPipeIdx = i
  }

  if (lastPipeIdx === -1) {
    console.error(`✖ 解析 RouteName 联合类型失败，请手动在 src/router/types.ts 追加 '${pascal}'`)
    process.exit(1)
  }

  const newRouteNameLine = `  | '${pascal}'`
  const declBlock = lines.slice(0, lastPipeIdx + 1).join('\n')

  if (declBlock.includes(newRouteNameLine)) {
    console.log(`  · RouteName '${pascal}' 已存在，跳过同步（幂等）`)
    return
  }

  lines.splice(lastPipeIdx + 1, 0, newRouteNameLine)
  writeFileSync(TYPES_PATH, lines.join('\n'), 'utf-8')
  console.log(`  ✓ src/router/types.ts：RouteName 联合类型追加 '${pascal}'`)
}

/** 输出用户下一步的手动清单（i18n / API / mock / 一致性校验 / 删除方法）。 */
function printNextSteps(name: string, pascal: string): void {
  console.log('')
  console.log('🎉 模块骨架生成完成！')
  console.log('')
  console.log('▶ 接下来手动做的事：')
  console.log('')
  console.log(
    `  1. 编辑 src/modules/${name}/apis/index.ts 完善 API 业务字段（${name}Api 占位已生成）`
  )
  console.log('')
  console.log(`  2. 编辑 src/modules/${name}/views/Index.vue 把"首页骨架"换成真实页面`)
  console.log('')
  console.log(`  3. 在 src/locales/{zh-CN,en-US}.ts 的 menu 段加 'menu.${name}' 翻译键`)
  console.log('')
  console.log(`  4. 在 mock/${name}.ts 加假数据（开发模式 mock 默认开启）`)
  console.log('')
  console.log(
    `  5. 跑 pnpm check:routes 验证 RouteName 三处一致性（types.ts / whitelist.ts / 路由文件）`
  )
  console.log('')
  console.log(`  6. 启动 pnpm dev，本地访问 http://localhost:5173/${name}`)
  console.log('')
  console.log(
    `  7. 在 src/store/modules/user.ts 给假登录账号的 permissions 加 '${name}:view' 等权限码（如需路由级权限）`
  )
  console.log('')
  console.log(
    `  8. 删除模块：直接 rm -rf src/modules/${name}/，再手动从 src/router/types.ts 移除 '${pascal}'（无残留）`
  )
  console.log('')
}

// ─── 入口 ─────────────────────────────────────────────────────────

const { name, pascal } = parseNameArg(process.argv)
const moduleDir = join(MODULES_DIR, name)

if (existsSync(moduleDir)) {
  console.error(`✖ 模块 "${name}" 已存在：${moduleDir}`)
  process.exit(1)
}

console.log(`📦 新建模块：${name}（RouteName: ${pascal}）`)

writeSkeleton(name, pascal, moduleDir)
syncRouteName(pascal)
printNextSteps(name, pascal)
