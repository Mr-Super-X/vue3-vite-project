/**
 * 本地同域网关配套：并行启动 6 个 app 的 vite dev server（各自注入 VITE_BASE=/<app>/）。
 *
 * 背景（docs/43 §同域网关）：生产为同域 path 部署（统一登录 cookie 跨 app 漫游），
 * 单 app 以默认 base '/' 起 dev 无法复现；本脚本按 app 注入 base 后并行拉起全部 dev server，
 * 与 docker-compose 的 nginx 网关（:8080 反代 5174-5179）配套：
 *
 *   终端 1：pnpm dev:gateway   # 6 个 dev server 前台常驻，Ctrl+C 一并退出
 *   终端 2：docker compose up  # nginx 网关
 *   浏览器：http://localhost:8080/（302 → /portal/）
 *
 * 端口由 @vv/config server.ts（5174 + portOffset）与各 app vite.config 钉死（strictPort），
 * 本脚本只注入 VITE_BASE；新增 app 须同步本列表、portOffset 与 docker/nginx.dev.conf。
 *
 * 为什么不用 turbo run dev：turbo 不支持 per-app env 注入，而 base 按 app 而异。
 *
 * 用法：pnpm dev:gateway
 */

import { spawn, type ChildProcess } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** 6 应用 dev 端口表（与 packages/config/src/server.ts portOffset / nginx.dev.conf 同源） */
const APPS = [
  { name: 'admin', port: 5174 },
  { name: 'docs', port: 5175 },
  { name: 'portal', port: 5176 },
  { name: 'h5', port: 5177 },
  { name: 'big', port: 5178 },
  { name: 'auth', port: 5179 },
] as const

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

/** 启动单个 app dev：注入 VITE_BASE=/<app>/ 后 spawn pnpm -C apps/<app> dev */
function startApp(name: string, port: number): void {
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
  console.log(`  ✓ [${name}] 启动中 → 网关路径 /${name}/（直查 http://localhost:${port}/${name}/）`)
}

function main(): void {
  console.log('🚀 同域网关模式：并行启动 6 个 app dev（base=/<app>/）…')
  console.log('   网关：docker compose up → http://localhost:8080/（302 → /portal/）\n')
  for (const { name, port } of APPS) {
    startApp(name, port)
  }
  process.on('SIGINT', () => shutdown('收到 Ctrl+C'))
  process.on('SIGTERM', () => shutdown('收到 SIGTERM'))
}

main()
