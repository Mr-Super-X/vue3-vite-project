/**
 * 校验 build/aliases.ts 与 tsconfig.app.json paths 一致性
 *
 * 复用 generate-tsconfig-paths.ts 的 --check 模式（单一逻辑来源）
 * 失败时 exit 1（CI 阶段会阻断）
 */

import { spawnSync } from 'node:child_process'

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', 'build/scripts/generate-tsconfig-paths.ts', '--check'],
  { stdio: 'inherit' }
)

process.exit(result.status ?? 1)
