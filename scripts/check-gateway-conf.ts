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
 *
 * 用法：pnpm check:gateway-conf（check-routes 汇总阶段自动复跑同一校验函数，CI 双保险）
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { APPS } from './apps-registry.mjs'

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

function main(): void {
  const errors = validateGatewayConf()
  if (errors.length > 0) {
    console.error(`✖ 网关配置校验失败（docker/nginx.dev.conf，${errors.length} 处）：`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exit(1)
  }
  console.log(
    `✓ 网关配置与注册表一致（${APPS.length} 个 app：${APPS.map((app) => `/${app.name}/ → :${app.port}`).join('，')}）`
  )
}

void main()
