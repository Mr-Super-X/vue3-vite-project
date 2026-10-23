#!/usr/bin/env node
/**
 * 校验 docker/nginx.dev.conf（本地同域网关）与 apps-registry 注册表一致
 *
 * 背景：nginx.dev.conf 是静态配置，无法 import 注册表；而 dev:gateway 的 6 个
 * location /<app>/ 块 + proxy_pass 端口必须与注册表（app 名单 + 端口）逐一对应——
 * 漏配某 app → 经网关 8080 访问该 app 404。本脚本只做「校验不生成」（生成 nginx 配置过重）。
 *
 * 校验项（全部通过返回 []，任一失败返回错误消息列表）：
 *   1. location 名单：每个注册 app 必须恰有一个 `location /<name>/ ` 前缀块
 *      （多余 location 即名单漂移，双向校验）；=/ 精确匹配与 /api/ 反代块不在此列
 *   2. 端口接线：每个注册 app 的 port 必须出现在某条 proxy_pass 目标中
 *      （location 名与端口错位的交叉漂移由 dev-gateway 直查端口 + 本校验的组合兜住）
 *   3. 端口双写锁死（validatePortWiring）：注册表 port 与各 app vite.config.ts 的
 *      portOffset 是同一事实的两处手写（port = SERVER_DEFAULTS.port + offset），
 *      漂移时 dev 实际端口与网关/文档不符且报错现象误导（2026-10-23 扩展性审查 P0）
 *
 * 用法：pnpm check:gateway-conf（check-routes 汇总阶段自动复跑同一校验函数，CI 双保险）
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APPS } from './apps-registry.mjs'
// SERVER_DEFAULTS.port 是 portOffset 的推导基准（packages/config/src/server.ts 单源），
// 与 generate-tsconfig-paths 引 packages/config 源码同先例
import { SERVER_DEFAULTS } from '../packages/config/src/server.ts'

const CONF_PATH = fileURLToPath(new URL('../docker/nginx.dev.conf', import.meta.url))

/** 非 app 的系统级 location 块（基础设施反代，不参与 app 名单比对） */
const SYSTEM_LOCATION_BLOCKS = new Set(['api'])

/** 读取网关 nginx 配置并比对注册表，返回错误消息列表（空数组 = 通过） */
export function validateGatewayConf(confText = readFileSync(CONF_PATH, 'utf-8')): string[] {
  const errors: string[] = []

  // 提取前缀 location 块名：`location /xxx/ {`（精确匹配 `location = / {` 不匹配本模式，安全）
  const blockNames = [...confText.matchAll(/location\s+\/([\w-]+)\//g)].map((m) => m[1]!)
  for (const { name, port } of APPS) {
    const count = blockNames.filter((blockName) => blockName === name).length
    if (count === 0)
      errors.push(`注册表 app '${name}' 在 nginx.dev.conf 缺少 location /${name}/ 反代块`)
    if (count > 1)
      errors.push(`nginx.dev.conf 存在 ${count} 个 location /${name}/ 块，期望恰好 1 个`)
    if (!confText.includes(`:${port}`)) {
      errors.push(`注册表 app '${name}'（端口 ${port}）未出现在任何 proxy_pass 目标中`)
    }
  }

  const appNames = new Set(APPS.map((app) => app.name))
  const extras = [
    ...new Set(
      blockNames.filter(
        (blockName) => !appNames.has(blockName) && !SYSTEM_LOCATION_BLOCKS.has(blockName)
      )
    ),
  ]
  if (extras.length > 0) {
    errors.push(
      `nginx.dev.conf 存在注册表之外的 location 块：/${extras.join('/, /')}/（从注册表移除或同步登记）`
    )
  }

  return errors
}

/**
 * 端口双写锁死：apps-registry.mjs 的绝对 port 与各 app vite.config.ts 的 portOffset
 * 是同一事实的两处手写（port = SERVER_DEFAULTS.port + offset），历史上无任何静态
 * 校验——dev 直启时实际端口与注册表漂移，表现是「某 app 经网关 404 / waitForPort 超时」
 * 且报错现象指向网络层，排查成本高。此处静态锁死，漂移即 CI 红。
 */
export function validatePortWiring(): string[] {
  const errors: string[] = []
  const appsDir = resolve(fileURLToPath(new URL('..', import.meta.url)), 'apps')
  for (const { name, port } of APPS) {
    const viteConfigPath = join(appsDir, name, 'vite.config.ts')
    if (!existsSync(viteConfigPath)) {
      errors.push(`apps/${name}/vite.config.ts 不存在（注册表登记了该 app 但无 vite 配置）`)
      continue
    }
    const text = readFileSync(viteConfigPath, 'utf-8')
    if (!text.includes('createViteConfig(')) {
      errors.push(
        `apps/${name}/vite.config.ts 未调用 createViteConfig 工厂（无法推导实际 dev 端口）`
      )
      continue
    }
    // 工厂缺省 portOffset = 0（SERVER_DEFAULTS.port 即 admin 实际端口），缺省声明合法
    const offsetMatch = text.match(/portOffset:\s*(\d+)/)
    const actual = SERVER_DEFAULTS.port + (offsetMatch ? Number(offsetMatch[1]) : 0)
    if (actual !== port) {
      errors.push(
        `apps/${name} 端口双写不一致：apps-registry.mjs port=${port}，但 vite.config.ts portOffset=${offsetMatch[1]} → 实际 dev 端口 ${actual}（须同步两处）`
      )
    }
  }
  return errors
}

function main(): void {
  const errors = validateGatewayConf()
  const portErrors = validatePortWiring()
  const all = [...errors, ...portErrors]
  if (all.length > 0) {
    console.error(`✖ 网关配置校验失败（docker/nginx.dev.conf + 端口双写，${all.length} 处）：`)
    for (const message of all) console.error(`  - ${message}`)
    process.exit(1)
  }
  console.log(
    `✓ 网关配置与注册表一致（${APPS.length} 个 app：${APPS.map((app) => `/${app.name}/ → :${app.port}`).join('，')}）；端口双写锁死通过`
  )
}

void main()
