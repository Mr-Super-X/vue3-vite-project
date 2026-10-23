import { fileURLToPath } from 'node:url'
import { createVitestConfig } from '@vv/config'
import viteConfig from './vite.config'

// coverage 阈值说明（2026-08-12 更新：guards/plugins 补测完成，基线 51.71/46.72/49.09/52.24）：
//   - 渐进路线图（避免 CI 倒退 + 推动补测试）：
//       v3.x（已达）：50/45/48/50 — 补全 plugins/{errorHandler,webVitals}
//                                    + router/guards/{login,permission,visibility,composable,remote-menu}
//       v4.0（2 月内）：70/70/65/70 — 补全 store/modules/{app,theme,router} + components/layout
//       v5.0（目标）：  80/80/70/80 — 补全业务模块 views（user/home/auth 等）
//   - perFile 暂不启用（避免单文件未达标阻塞）；按业务模块渐进加
//   - 实测命令：pnpm test:coverage（输出到 coverage/index.html）
export default createVitestConfig({
  appRoot: fileURLToPath(new URL('./', import.meta.url)),
  viteConfig,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: ['src/**/*.{ts,vue}'],
    exclude: ['src/**/__tests__/**', 'src/**/index.ts', 'src/main.ts', 'src/types/**'],
    thresholds: { lines: 50, functions: 48, branches: 45, statements: 50 },
  },
})
