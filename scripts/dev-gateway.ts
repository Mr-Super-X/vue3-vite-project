/**
 * 本地同域网关（一体化单命令）：node 网关 :8080 + 串行启动 6 个 app 的 vite dev server。
 *
 * 背景（docs/43 §同域网关）：生产为同域 path 部署（统一登录 cookie 跨 app 漫游），
 * 单 app 以默认 base '/' 起 dev 无法复现；本脚本内置 node 反向代理网关
 * （scripts/node-gateway.ts，零依赖，替代原 docker-compose + nginx 双终端方案）：
 *
 *   pnpm dev:gateway    # 唯一命令：网关 + 6 dev server 前台常驻，Ctrl+C 一并退出
 *   浏览器：http://localhost:8080/（302 → /portal/）
 *
 *   pnpm dev:gateway admin auth   # 子集模式（2026-10-27）：网关 + 仅指定 app，
 *   # 同一入口地址（8080 同源）——日常中后台开发省一半启动时间与内存
 *
 * 子集语义：未指定 app 的网关前缀仍保留路由（代码派生），上游未起时访问即 502
 * （与「单 app dev」语义一致：统一登录全链路必须走网关）；根 302 动态判定——
 * 子集含 portal 跳 /portal/，否则跳子集第一个（避免跳未起 app 落 502）。
 *
 * ⚠️ 串行启动（非并行，2026-10-23 竞态修复）：6 app 共享 @vv/mock 数据源，
 * vite-plugin-mock 用 bundle-require 把 mock 源编译成 _*.bundled_*.mjs 临时文件
 * （落在 mock 源同目录）+ clean-mock-bundled 插件 configureServer 启动时抢删。
 * 并行启动时多进程同时编译同一 mock 源 → cleanup 抢删正在 import 的临时文件 →
 * bundle-require unlink ENOENT → vite-plugin-mock 静默清空 mockData → 该 app 的
 * dev mock 中间件全空（接口 404，实测 auth 踩中，mock 源 19 个 .ts 文件越 500ms 阈值，
 * 见 packages/config/src/clean-mock-bundled.ts 头部事故记录）。
 * 串行（前一个端口就绪再启下一个）彻底消除并发编译窗口。
 *
 * 启动顺序：先监听网关 8080（EADDRINUSE 立即报错——不浪费 6 个 dev 启动后才
 * 发现端口冲突），再串行起 dev server。
 *
 * 端口 = packages/config/src/server.ts SERVER_DEFAULTS.port(5174) + 各 app vite.config
 * portOffset；名单与端口单一事实源是 scripts/apps-registry.mjs——本脚本只注入 VITE_BASE，
 * 网关路由表由 scripts/node-gateway.ts 的 buildGatewayRoutes(APPS) 单源代码派生
 * （原 nginx.dev.conf 的 check-gateway-conf 双写校验已随 node 网关方案删除）。
 *
 * 为什么不用 turbo run dev：turbo 不支持 per-app env 注入，而 base 按 app 而异。
 *
 * 用法：pnpm dev:gateway（路由/端口一致性另跑 pnpm check:routes）
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { realpathSync } from 'node:fs'
import type { Server } from 'node:http'
import { createConnection } from 'node:net'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { APPS } from './apps-registry.mjs'
import { buildGatewayRoutes, createGatewayServer } from './node-gateway.ts'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** 同域网关监听端口（与原 nginx 网关一致 :8080） */
const GATEWAY_PORT = 8080

const children: ChildProcess[] = []

/** 网关 server（main 中赋值；shutdown 时关闭） */
let gateway: Server | null = null

/** 按进程树终止子进程：Windows 下 shell:true 拉起的是 cmd.exe，直接 kill 会孤儿化 vite */
function killTree(child: ChildProcess): void {
  if (child.pid == null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
  } else {
    child.kill('SIGTERM')
  }
}

/** 任一 dev server 异常退出（strictPort 端口冲突 / 编译失败）→ 整组停止，避免半活状态 */
function shutdown(reason: string): void {
  console.log(`\n🛑 ${reason}，正在停止网关与 ${children.length} 个 dev server…`)
  gateway?.close()
  for (const child of children) {
    killTree(child)
  }
  // 给进程树终止留出宽限，随后强制退出本脚本
  setTimeout(() => process.exit(0), 2000).unref()
}

/** 探测端口是否已可连接（dev server 就绪信号） */
function waitForPort(port: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const attempt = (): void => {
      const sock = createConnection({ port, host: '127.0.0.1' })
      sock.once('connect', () => {
        sock.end()
        resolve()
      })
      sock.once('error', () => {
        sock.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`端口 ${port} 等待超时（${timeoutMs}ms）`))
        } else {
          setTimeout(attempt, 300)
        }
      })
    }
    attempt()
  })
}

/**
 * 启动单个 app dev（异步）：注入 VITE_BASE=/<app>/ 后 spawn pnpm -C apps/<app> dev，
 * 等待其 dev server 端口就绪后 resolve——保证下一个 app 启动时，本 app 的
 * vite-plugin-mock 已完成 mock 源编译（避免多进程并发编译同一 @vv/mock 源的 cleanup 竞态）。
 */
async function startApp(name: string, port: number): Promise<void> {
  // shell:true：Windows 下 pnpm 实为 pnpm.cmd，无 shell 无法解析
  const child = spawn('pnpm', ['-C', `apps/${name}`, 'dev'], {
    cwd: REPO_ROOT,
    env: { ...process.env, VITE_BASE: `/${name}/` },
    stdio: 'inherit',
    shell: true,
  })
  child.on('exit', (code, signal) => {
    if (code !== 0 && signal === null) {
      shutdown(`[${name}] dev server 异常退出（exit ${code}，端口 ${port}）`)
    }
  })
  children.push(child)
  await waitForPort(port)
  console.log(`  ✓ [${name}] 就绪 → 网关路径 /${name}/（直查 http://localhost:${port}/${name}/）`)
}

/**
 * 从命令行参数解析 app 子集（未给参数 → 全量）。
 *
 * @param argv process.argv.slice(2)（app 名列表，如 ['admin', 'auth']）
 * @returns 按 APPS 顺序排序的子集（保持注册表顺序，保证输出与网关路由表一致）
 * @throws 传了未知名即抛错——拼写错误（如 admn）静默忽略会让开发者以为起了实际没起
 */
export function resolveAppSubset(argv: string[]): typeof APPS {
  if (argv.length === 0) return APPS
  const known = new Set(APPS.map((a) => a.name))
  const unknown = argv.filter((name) => !known.has(name))
  if (unknown.length > 0) {
    throw new Error(`未知 app 名：${unknown.join(', ')}（可用：${[...known].join(', ')}）`)
  }
  return APPS.filter((a) => argv.includes(a.name))
}

/** 根 302 目标动态判定：子集含 portal 跳 /portal/，否则跳子集第一个（未起 portal 时避免根 502） */
export function resolveRootRedirect(subset: typeof APPS): string {
  // 空子集防御（2026-10-28 /autoplan E8）：当前调用链（resolveAppSubset 对未知名抛错、
  // 至少返回一个已知 app）不会传入空数组——防御未来新调用方传入空集致 subset[0] undefined
  if (subset.length === 0) throw new Error('resolveRootRedirect：空子集无根 302 目标')
  return subset.some((a) => a.name === 'portal') ? '/portal/' : `/${subset[0].name}/`
}

async function main(): Promise<void> {
  const subset = resolveAppSubset(process.argv.slice(2))
  const rootRedirect = resolveRootRedirect(subset)
  const isSubset = subset.length < APPS.length

  console.log(
    `🚀 同域网关模式：node 网关 :${GATEWAY_PORT} + 串行启动 ${subset.length} 个 app dev（base=/<app>/，避免共享 mock 源并发编译竞态）…\n`
  )

  // 先监听网关：8080 被占（如旧 docker 网关未关）立即失败，不浪费后续 dev 启动
  gateway = createGatewayServer({
    rootRedirect,
    // 路由表仍传全量 APPS：未起 app 的前缀保留路由（上游未起即 502），与全量模式语义对齐
    routes: buildGatewayRoutes(APPS),
  })
  try {
    await new Promise<void>((resolve, reject) => {
      gateway!.once('error', reject)
      gateway!.listen(GATEWAY_PORT, () => resolve())
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.error(
        `✖ 网关端口 ${GATEWAY_PORT} 被占用——常见占用者：` +
          `\n  ① 生产容器未停：docker compose -f docker-compose.prod.yml down` +
          `\n  ② 旧 dev:gateway 进程残留：Ctrl+C 或重启终端` +
          `\n  ③ 其他进程：netstat -ano | findstr :${GATEWAY_PORT} 查占用者 PID`
      )
      process.exit(1)
    }
    throw err
  }
  console.log(
    `🌐 网关就绪：http://localhost:${GATEWAY_PORT}/（GET / 302 → ${rootRedirect}；/api/ → admin${
      isSubset && !subset.some((a) => a.name === 'admin')
        ? '（⚠️ 本模式未起 admin，/api/ 将 502）'
        : ''
    }）\n`
  )

  // 串行：前一个 dev server 端口就绪（mock 编译完成）再启下一个，消除并发编译窗口
  for (const { name, port } of subset) {
    try {
      await startApp(name, port)
    } catch (err) {
      shutdown(`[${name}] 启动超时：${err instanceof Error ? err.message : String(err)}`)
      return
    }
  }
  console.log(`\n🎉 全部就绪：经网关 http://localhost:${GATEWAY_PORT}/ 访问（Ctrl+C 一并退出）`)
  if (isSubset) {
    console.log(
      `  ℹ️  子集模式：仅起了 ${subset.map((a) => a.name).join(' / ')}；其余前缀访问返回 502（预期）`
    )
  }
  process.on('SIGINT', () => shutdown('收到 Ctrl+C'))
  process.on('SIGTERM', () => shutdown('收到 SIGTERM'))
}

// CLI 守卫：与 check-* 脚本同一模式——被 import（spec / 工具链）时不触发 main()
// （main 会监听 8080，误执行撞 EADDRINUSE；2026-10-28 E8 由 isTestRun 反模式统一为本模式，
// 顺带移除原注释中「spec 用例只消费纯函数」的 stale 陈述——当时并无 spec 文件）
const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  void main()
}
