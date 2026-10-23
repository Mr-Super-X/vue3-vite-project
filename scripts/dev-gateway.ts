/**
 * 本地同域网关配套：串行启动 6 个 app 的 vite dev server（各自注入 VITE_BASE=/<app>/）。
 *
 * 背景（docs/43 §同域网关）：生产为同域 path 部署（统一登录 cookie 跨 app 漫游），
 * 单 app 以默认 base '/' 起 dev 无法复现；本脚本按 app 注入 base 后拉起全部 dev server，
 * 与 docker-compose 的 nginx 网关（:8080 反代 5174-5179）配套：
 *
 *   终端 1：pnpm dev:gateway   # 6 个 dev server 前台常驻，Ctrl+C 一并退出
 *   终端 2：docker compose up  # nginx 网关
 *   浏览器：http://localhost:8080/（302 → /portal/）
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
 * 端口 = packages/config/src/server.ts SERVER_DEFAULTS.port(5174) + 各 app vite.config
 * portOffset；名单与端口单一事实源是 scripts/apps-registry.mjs——本脚本只注入 VITE_BASE。
 * 新增 app：注册表追加条目 + nginx.dev.conf 补 location 块（check-gateway-conf 校验兜底）。
 *
 * 为什么不用 turbo run dev：turbo 不支持 per-app env 注入，而 base 按 app 而异。
 *
 * 用法：pnpm dev:gateway（配置一致性另跑 pnpm check:gateway-conf）
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createConnection } from 'node:net'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { APPS } from './apps-registry.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const children: ChildProcess[] = []

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
  console.log(`\n🛑 ${reason}，正在停止 ${children.length} 个 dev server…`)
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

async function main(): Promise<void> {
  console.log(
    `🚀 同域网关模式：串行启动 ${APPS.length} 个 app dev（base=/<app>/，避免共享 mock 源并发编译竞态）…`
  )
  console.log('   网关：docker compose up → http://localhost:8080/（302 → /portal/）\n')
  // 串行：前一个 dev server 端口就绪（mock 编译完成）再启下一个，消除并发编译窗口
  for (const { name, port } of APPS) {
    try {
      await startApp(name, port)
    } catch (err) {
      shutdown(`[${name}] 启动超时：${err instanceof Error ? err.message : String(err)}`)
      return
    }
  }
  console.log(`\n🎉 ${APPS.length} 个 dev server 全部就绪，经网关 http://localhost:8080/ 访问`)
  process.on('SIGINT', () => shutdown('收到 Ctrl+C'))
  process.on('SIGTERM', () => shutdown('收到 SIGTERM'))
}

void main()
