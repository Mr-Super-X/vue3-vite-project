/**
 * Vite 插件：自动清理 vite-plugin-mock 在 mock/ 目录生成的 bundled 临时文件
 *
 * 背景：vite-plugin-mock@3.x 内部通过 bundle-require 把 mock 源文件打包成
 * `_xxx.bundled_<timestamp>_<random>.mjs` 后再执行；这些临时文件按
 * `getOutputFile` 规则落到与源 mock 文件同目录（mock/），每次启动 / mock 变更
 * 都会生成新的带时间戳的副本，长期累积污染工作区。
 *
 * 清理策略：
 * 1. 启动时（configureServer）一次性清空已有 bundled 文件
 * 2. 监听 mock/ 目录，对新生成的 bundled 文件延迟 500ms 后删除
 *    （延迟是因为 plugin 在生成后还需 `require()` 加载到内存，立即删除会触发 ENOENT）
 *
 * 安全：
 * - 只匹配 `mock/` 目录，不影响其它位置
 * - 文件名硬约束 `_*.bundled_*.mjs` / `_*.bundled_*.cjs`，与 vite-plugin-mock
 *   自身 `ignored` 规则一致，不会误删真实 mock 文件
 */
import { existsSync, readdirSync, unlinkSync, watch } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const BUNDLED_RE = /^_.*\.bundled_.*\.(?:mjs|cjs)$/
const CLEANUP_DELAY_MS = 500

export function cleanMockBundled(): Plugin {
  const mockDir = resolve(process.cwd(), 'mock')
  let watcher: ReturnType<typeof watch> | null = null

  function cleanupOnce(): void {
    if (!existsSync(mockDir)) return
    for (const name of readdirSync(mockDir)) {
      if (BUNDLED_RE.test(name)) {
        try {
          unlinkSync(resolve(mockDir, name))
        } catch {
          // 文件可能已被其它进程 / 上面循环删掉，吞 ENOENT
        }
      }
    }
  }

  return {
    name: 'vv-portal:clean-mock-bundled',
    apply: 'serve',
    configureServer() {
      cleanupOnce()
      try {
        watcher = watch(mockDir, { recursive: false }, (_event, filename) => {
          if (!filename || !BUNDLED_RE.test(filename)) return
          // 延迟删除：bundle-require 内部会 await import / require 加载，
          // 立即 unlink 在某些 Node 版本上会触发 EBUSY。500ms 经验值足够。
          setTimeout(() => {
            try {
              unlinkSync(resolve(mockDir, filename))
            } catch {
              // 已被删除则忽略
            }
          }, CLEANUP_DELAY_MS)
        })
      } catch {
        // watch 启动失败（mock 目录不存在等）静默降级，仅一次性清理仍生效
      }
    },
    closeBundle() {
      watcher?.close()
      watcher = null
      cleanupOnce()
    },
  }
}
