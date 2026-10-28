/**
 * postinstall IDE 声明轻量生成（/autoplan D3）——消除「clone 后 IDE 满屏红」。
 *
 * 背景：apps/<a>/src/types/auto-imports.d.ts 与 components.d.ts 被 .gitignore 屏蔽，
 * 只在 vite dev/build 时由 unplugin 生成——新人 clone + install 后首启 IDE 全红，
 * 靠 docs/10 预警「先跑一次 dev/build」把成本转嫁给每个新人。
 *
 * 方案：起 vite dev server 到 listening 即关——unplugin 的 dts 钩子在插件 buildStart
 * 阶段写声明文件，不编译任何页面（对比全量 build 的分钟级，本脚本秒级）。默认只跑
 * admin（主开发入口）；其余 app 首次 dev 时自然生成。
 *
 * 环境守卫：
 * - CI（process.env.CI）直接退出——CI 的 build 步骤会生成声明，无需重复；
 * - 单 app 失败（如 strictPort 端口被占）只打警告不阻塞 install（best-effort）。
 *
 * 用法：pnpm generate:declarations [app...]（postinstall 自动调用，默认 admin）
 */
import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer, type ViteDevServer } from 'vite'

const ROOT = resolve(import.meta.dirname, '..')
const DEFAULT_APPS = ['admin']

async function generateForApp(app: string): Promise<boolean> {
  const configFile = resolve(ROOT, `apps/${app}/vite.config.ts`)
  if (!existsSync(configFile)) {
    console.warn(`[generate-declarations] 跳过 ${app}：${configFile} 不存在`)
    return false
  }
  let server: ViteDevServer | undefined
  try {
    server = await createServer({ configFile, root: resolve(ROOT, `apps/${app}`) })
    await server.listen()
    return true
  } finally {
    await server?.close()
  }
}

export async function main(): Promise<void> {
  if (process.env.CI) {
    // CI 的 build 步骤（build-only 先于 type-check:full）会生成声明，跳过省时
    console.log('[generate-declarations] CI 环境跳过（build 步骤会生成声明）')
    return
  }
  const apps = process.argv.slice(2)
  const targets = apps.length > 0 ? apps : DEFAULT_APPS
  for (const app of targets) {
    try {
      const ok = await generateForApp(app)
      if (ok) console.log(`[generate-declarations] ✓ ${app} 声明已生成`)
    } catch (err) {
      // 端口占用（strictPort）等启动失败不阻塞 install——用户首次 dev 仍会生成
      console.warn(
        `[generate-declarations] ⚠ ${app} 失败（不影响安装，首次 dev 会自动生成）：`,
        err instanceof Error ? err.message : err
      )
    }
  }
}

// CLI 守卫：被 import 时不执行（与 check-* 脚本同一模式）
const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  // 2026-10-28 实测：vite server.close() 后仍有保活句柄（unocss config watcher 等），
  // 事件循环不空致 postinstall 挂起——本脚本是 CLI 工具（非测试 runner），声明生成
  // 完成后显式退出；best-effort 语义下错误也不阻塞 install（exit 0）
  main()
    .catch((err: unknown) => {
      console.error('[generate-declarations] 未预期错误（不阻塞安装）：', err)
    })
    .finally(() => process.exit(0))
}
