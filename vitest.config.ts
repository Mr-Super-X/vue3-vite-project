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
        // 覆盖率门槛说明（2026-07-24 审计）：
        //   - 当前整体覆盖率 ~45%（src/api + src/store 部分模块覆盖率高，
        //     src/store/modules/{app,theme,router} + src/components/layout/Sidebar + 业务 views 未覆盖）
        //   - 门槛设为 40% 是务实方案：CI 不阻塞合入，但接近当前覆盖率下浮 5%
        //   - 目标：每个新文件必须 ≥80%（在 PR review 时检查）
        //   - 改进方向：补全 src/store/{app,theme,router,user}.spec.ts 与
        //     src/components/layout/{Header,Sidebar}.spec.ts 与业务模块 views 单测
        thresholds: { lines: 40, functions: 35, branches: 40, statements: 40 },
        // perFile 暂不启用（避免单文件未达标阻塞）；后续按业务模块渐进加
      },
    },
  })
)
