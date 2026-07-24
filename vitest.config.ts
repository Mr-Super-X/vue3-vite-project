import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig as never,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      globals: true,
      server: {
        deps: {
          inline: ['element-plus', '@element-plus/icons-vue'],
        },
      },
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/__tests__/**', 'src/**/index.ts', 'src/main.ts', 'src/types/**'],
        // 覆盖率门槛说明（2026-07-24 v3 审计更新）：
        //   - 真实基线：Statements 44.6% / Branches 42.89% / Functions 41.9% / Lines 45%
        //     （src/utils 98%+，src/store/modules 64.9%；src/plugins/src/router/guards ~10%）
        //   - 渐进路线图（避免 CI 倒退 + 推动补测试）：
        //       v3.x（当前）：40/35/40/40 — 不阻塞合入，记录基线
        //       v3.1（1 月内）：55/55/50/55 — 补全 plugins/errorHandler + plugins/webVitals
        //                                    + router/helpers + router/guards/{login,permission,visibility,composable}
        //       v4.0（2 月内）：70/70/65/70 — 补全 store/modules/{app,theme,router} + components/layout
        //       v5.0（目标）：  80/80/70/80 — 补全业务模块 views（user/home/auth 等）
        //   - perFile 暂不启用（避免单文件未达标阻塞）；按业务模块渐进加
        //   - 实测命令：pnpm test:coverage（输出到 coverage/index.html）
        thresholds: { lines: 40, functions: 35, branches: 40, statements: 40 },
        // perFile 暂不启用（避免单文件未达标阻塞）；后续按业务模块渐进加
      },
    },
  })
)
