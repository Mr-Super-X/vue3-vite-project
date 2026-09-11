/**
 * Vite 工程配置
 *
 * 本文件定位：
 *   - **装配清单**：负责组合 plugins 数组 + 各 defineConfig 字段
 *   - **工程配置**：路径别名 / vendorChunks / server / scs 注入等已迁移到 `build/` 子模块
 *     （单一来源详见 build/index.ts barrel re-export，避免与 tsconfig.app.json 双维护）
 *
 * 历史：
 *   - 2026-09-10: 抽出 SRC_DIR_ALIASES / vendorChunks / server / scss 到 build/* 单一来源
 *   - 详见 docs/superpowers/specs/2026-09-10-vite-config-split-design.md
 */
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'
import { visualizer } from 'rollup-plugin-visualizer'
import { cleanMockBundled } from './scripts/vite-plugin-clean-mock'

// 工程配置（单一来源：build/index.ts barrel re-export）
// 详见 docs/superpowers/specs/2026-09-10-vite-config-split-design.md
import {
  resolveSrcDirAliases,
  VENDOR_CHUNKS,
  createProxyConfig,
  SERVER_DEFAULTS,
  SCSS_PREPROCESSOR_OPTIONS,
} from './build'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    UnoCSS(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        // 业务侧高频 composables（详见 src/composables/*）
        // 显式列名不走 dirs 自动扫描——避免误扫到同目录的 *.spec.ts（vitest 解析会异常）
        // useAppRouter 是项目自研的路由高层 API（区别于 vue-router 自带的 useRouter）
        { from: '@/composables/useAuth', imports: [{ name: 'useAuth' }] },
        { from: '@/composables/useLogout', imports: [{ name: 'useLogout' }] },
        { from: '@/composables/useRequest', imports: [{ name: 'useRequest' }] },
        { from: '@/composables/useAppRouter', imports: [{ name: 'useAppRouter' }] },
        // useDialog：命令式弹窗（详见 src/composables/useDialog）
        // 同模块的 DialogCancelledError / setDialogAppContext / getDialogAppContext 不注入：
        // 第一个是类型（不参与运行时），后两个只在 main.ts / useConfirm 内部调用（不应污染 setup 全局作用域）
        { from: '@/composables/useDialog', imports: [{ name: 'useDialog' }] },
        // useConfirm：二次确认（详见 src/composables/useConfirm）
        // 取消时 resolve(false) 而非 reject，故调用方无须 try/catch
        { from: '@/composables/useConfirm', imports: [{ name: 'useConfirm' }] },
        // 业务侧高频 utils（详见 src/utils/*）
        { from: '@/utils/bem', imports: [{ name: 'createNamespace' }] },
      ],
      resolvers: [
        // importStyle: 'css' —— 组件/API（ElMessage 等）样式按需自动注入，
        // main.ts 不再全量引入 element-plus/dist/index.css（gzip 省 ~30KB）
        ElementPlusResolver({ importStyle: 'css' }),
      ],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
      dts: 'src/types/components.d.ts',
    }),
    // mock 启用开关由 VITE_USE_MOCK 控制（2026-07-27 切换）。
    // dev 默认开启：用户 clone 后未建 .env 时，VITE_USE_MOCK=undefined，
    // `!== 'false'` 判定为 true，与原 NODE_ENV 行为一致。
    // 联调真实后端：在 .env.development 设 VITE_USE_MOCK=false。
    viteMockServe({
      mockPath: 'mock',
      enable: process.env.VITE_USE_MOCK !== 'false',
      watchFiles: true,
    }),
    // 清理 vite-plugin-mock 在 mock/ 生成的 _*.bundled_*.mjs 临时文件
    cleanMockBundled(),
    // 包体积分析（默认关闭，通过 ANALYZE=true 启用）
    // peerDeps 支持 rolldown 1.x（Vite 8 用），无需额外配置
    ...(process.env.ANALYZE === 'true'
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap', // 树状图，模块层级清晰
          }),
        ]
      : []),
  ],
  server: {
    // port 5174 / strictPort: true 来自 build/server.ts 的 SERVER_DEFAULTS
    // proxy 来自 build/proxy.ts 的 createProxyConfig(env) —— 当前返回 {} 占位
    // 联调真实后端时在 build/proxy.ts 内按需补充 _env 字段解析
    ...SERVER_DEFAULTS,
    proxy: createProxyConfig(process.env),
  },
  resolve: {
    alias: resolveSrcDirAliases(),
  },
  css: {
    preprocessorOptions: {
      // SCSS 'new-global' deprecation：Dart Sass 1.78+ 警告 "b() 内 !global 设新变量"，
      // 由于 bem mixin 设计依赖此模式但每个 <style scoped> 是独立 stylesheet 根，
      // 全局静默该 deprecation 不影响 2.0 升级（届时需重构 bem mixin 不依赖 !global）。
      //
      // additionalData 注入到每个 <style lang="scss"> / .scss 文件开头，让 bem mixin
      // 通过 $BEM_PREFIX 自动拼前缀；与 src/utils/bem.ts 的 import.meta.env.VITE_BEM_PREFIX
      // 共享同一来源（环境变量，未设置时回退 'vv' 保持向后兼容）。
      //
      // 关键技术点：sass 的 @use 模块化语义要求「变量只在 module 内部定义」，
      // 如果调用方 namespace 也声明 $BEM_PREFIX，会报 "This module and the new module
      // both define" 编译错误。解决方案：用 sass 的 with 语法把变量值注入到 bem 模块
      // 内部的 !default 兜底；bem.scss 内部用 !default，未传时回退 'vv'（单测/手写 SCSS）。
      // 调用方文件因此**不要再**写 @use 'bem'，避免重复引入——由本 additionalData 统一引入。
      //
      // silenceDeprecations 白名单：
      //   - 'new-global'：bem mixin 的 b() 内 $B: $block !global，Dart Sass 1.78+ 警告
      //     "b() 内 !global 设新变量"。每个 <style scoped> 是独立 stylesheet 根，全局静默
      //     不影响 2.0 升级（届时需重构 bem mixin 不依赖 !global）。
      //   - 'if-function'：bem mixin 的 b() 内用 if($cond, $a, $b) 拼接前缀，Dart Sass 1.78+
      //     标记 if-function 为 deprecation 但函数仍可用。改用 @if 块会让表达式级赋值退化为
      //     block 级冗余代码，CSS 模式 if(...: ...; else:) 在 SCSS 文件中 sass 1.101 解析拒绝，
      //     暂时静默该 deprecation。
      //
      // 实际 additionalData 值 + silenceDeprecations 数组见 build/scss.ts 的 SCSS_PREPROCESSOR_OPTIONS
      scss: SCSS_PREPROCESSOR_OPTIONS,
      less: { javascriptEnabled: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // 显式启用 tree-shaking（true = rolldown 默认推荐配置：移除未引用的 export、合并变量声明、移除未使用参数）
      // 注：Vite 8 用 rolldown 替代 rollup，类型只接受 boolean | TreeshakingOptions，不再支持 'recommended' 字符串
      treeshake: true,

      // 如果后续需要精细化定制（如标记纯函数、保留 console.log、处理 polyfill 副作用等），
      // 可改为 TreeshakingOptions 对象。常用字段说明：
      //
      //   manualPureFunctions: ['composedPath', 'foo', 'bar']
      //     // 告知打包器"这函数无副作用"，更激进摇树。
      //     // 适用：utils/ 里有多个 export，但部分未被使用。
      //
      //   moduleSideEffects: (id) => boolean
      //     // 动态判断某模块是否有副作用（false = 可摇，true = 保留）。
      //     // 适用：项目里引入了修改全局变量的 polyfill 或 polyfill.io 的垫片。
      //     //   例：if (id.includes('polyfill/')) return true
      //
      //   annotations: true
      //     // 读取 /*#__PURE__*/ 注释作为摇树提示（手动控制粒度）。
      //     // 适用：第三方库摇不掉，但你可以用注释告诉打包器"这调用无副作用"。
      //
      //   joinVars: true
      //     // 合并多个变量声明（如 const a = 1; const b = 2; → const a = 1, b = 2;）。
      //     // 收益：减少代码体积，但可能影响 source map 可读性。
      //
      //   correctVarValueBeforeDeclaration: false（默认 false，建议生产开启）
      //     // 提前计算变量值（如 const x = 1 + 2; → const x = 3;）。
      //     // 收益：减少运行时计算，但对 source map 不友好。
      //
      // 完整字段见 @rolldown/types 或 node_modules/.pnpm/rolldown@1.1.5/.../define-config-BhJ90aEv.d.mts
      output: {
        // 手动拆分第三方库（vendor chunk）→ 利用浏览器强缓存
        // 业务代码 (src/) 变化时只更新业务 chunk，第三方库 chunk 命中缓存
        // 注：Vite 8 用 rolldown 替代 rollup，manualChunks 必须是函数（不能是对象）
        manualChunks(id) {
          // 业务代码不归 vendor
          if (!id.includes('node_modules')) return undefined
          // VENDOR_CHUNKS 来自 build/vendor-chunks.ts —— 顺序敏感（vue → ui → charts）
          // 顺序敏感：先匹配先返回，新加组必须 append 到末尾
          for (const { name, patterns } of VENDOR_CHUNKS) {
            if (patterns.some((pattern) => id.includes(pattern))) return name
          }
          // 其他第三方库：axios / vue-i18n / 等
          return 'vendor-utils'
        },
      },
    },
  },
})
