/**
 * Vite 配置工厂（Monorepo 单一出口）
 *
 * 定位：把「插件装配 + 路径别名 + css 预处理 + 构建分包」收敛为包内唯一实现，
 * 各 app 的 vite.config.ts 只声明 app 参数（appRoot/appName/mockPath/...）与私有插件。
 *
 * 迁移注记（P1-1 过渡态）：
 *   - packages/ui、packages/shared 尚未落地（P1-3/P1-4 迁入），组件目录 / 本地图标集合 /
 *     别名经 resolvePkgFirst 回落到 app 旧位置；包落地后 existsSync 自动切换，无需改这里
 *   - AutoImport 的 composables/utils 暂保留 '@/...' 形式注入（from 仍指 app 自身 src），
 *     P1-3 @vv/shared 落地后改包名注入（{ from: '@vv/shared', imports: [...] }）
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// unplugin-vue-components v32 已移除内置 IconsResolver，图标解析器改从 unplugin-icons/resolver 导入
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import { viteMockServe } from 'vite-plugin-mock'
import { defineConfig, type PluginOption } from 'vite'

// 包内相对导入必须带 .ts 扩展名（同 index.ts 注释：Node 原生 ESM 不补全扩展名）
import { createAppAliases, resolvePkgFirst, UI_SRC_DIR } from './app-aliases.ts'
import { cleanMockBundled } from './clean-mock-bundled.ts'
import { createPostcssPlugins } from './postcss.ts'
import { createProxyConfig } from './proxy.ts'
import { createScssPreprocessorOptions } from './scss.ts'
import { SERVER_DEFAULTS } from './server.ts'
import { VENDOR_CHUNKS } from './vendor-chunks.ts'

export interface AppViteOptions {
  /** app 根目录（绝对路径，调用方用 fileURLToPath(new URL('.', import.meta.url))） */
  appRoot: string
  /** app 标识（注入 import.meta.env.VITE_APP_ID） */
  appName: string
  /** vite base；CLI --base 优先级更高（gh-pages 演示构建走 CLI 注入，见 deploy.yml） */
  base?: string
  /** mock 目录绝对路径；缺省则不挂 vite-plugin-mock（无 mock 依赖的 app） */
  mockPath?: string
  /** dev server 端口偏移（多 app 并行 dev 时区分，port = SERVER_DEFAULTS.port + portOffset） */
  portOffset?: number
  /** h5 rem 适配开关（postcss-pxtorem，作用域 appRoot/src/layouts/h5 与 src/modules/h5-*） */
  h5Rem?: boolean
  /** app 私有插件（如 vite-plugin-vue-devtools / rollup-plugin-visualizer） */
  extraPlugins?: PluginOption[]
}

export function createViteConfig({
  appRoot,
  appName,
  base = '/',
  mockPath,
  portOffset = 0,
  h5Rem = false,
  extraPlugins = [],
}: AppViteOptions) {
  // 本地 app 图标集合（i-app-*）：P1-4 迁入 @vv/ui 前回落到 app 旧位置
  const iconsDir = resolvePkgFirst(
    path.join(UI_SRC_DIR, 'assets/icons'),
    path.join(appRoot, 'src/assets/icons')
  )

  return defineConfig({
    base,
    plugins: [
      vue(),
      vueJsx(),
      UnoCSS(),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          // 业务侧高频 composables（详见 app src/composables/*）
          // 显式列名不走 dirs 自动扫描——避免误扫到同目录的 *.spec.ts（vitest 解析会异常）
          // useAppRouter 是项目自研的路由高层 API（区别于 vue-router 自带的 useRouter）
          // P1-1 过渡态：from 仍指 app 自身 src（'@/' 别名）；P1-3 迁入 @vv/shared 后改包名注入
          { from: '@/composables/useAuth', imports: [{ name: 'useAuth' }] },
          { from: '@/composables/useLogout', imports: [{ name: 'useLogout' }] },
          { from: '@/composables/useRequest', imports: [{ name: 'useRequest' }] },
          { from: '@/composables/useAppRouter', imports: [{ name: 'useAppRouter' }] },
          // useDict：字典组合式 API（契约形态按 code 解构）
          { from: '@/composables/useDict', imports: [{ name: 'useDict' }] },
          // useDialog：命令式弹窗；同模块的 DialogCancelledError / setDialogAppContext /
          // getDialogAppContext 不注入：第一个是类型（不参与运行时），后两个只在
          // main.ts / useConfirm 内部调用（不应污染 setup 全局作用域）
          { from: '@/composables/useDialog', imports: [{ name: 'useDialog' }] },
          // useConfirm：二次确认；取消时 resolve(false) 而非 reject，调用方无须 try/catch
          { from: '@/composables/useConfirm', imports: [{ name: 'useConfirm' }] },
          // 业务侧高频 utils（BEM 类名工具）
          { from: '@/utils/bem', imports: [{ name: 'createNamespace' }] },
        ],
        resolvers: [
          // importStyle: 'css' —— 组件/API（ElMessage 等）样式按需自动注入，
          // main.ts 不再全量引入 element-plus/dist/index.css（gzip 省 ~30KB）
          ElementPlusResolver({ importStyle: 'css' }),
        ],
        dts: path.join(appRoot, 'src/types/auto-imports.d.ts'),
      }),
      // ===== 图标体系（docs/39）=====
      // 编译期把模板中的 <i-ep-plus /> 等标签解析为内联 SVG Vue 组件，
      // 图标按需打包、产物零外部请求（插件只认 ~icons/* 虚拟模块导入）
      Icons({
        compiler: 'vue3',
        customCollections: {
          // app 集合：本地 SVG 资产（git 管理），编译期由 FileSystemIconLoader 读取；
          // transform 把非 none 的 fill/stroke 强制 currentColor，使图标跟随父级 color / CSS 变量换色
          app: FileSystemIconLoader(iconsDir, (svg) =>
            svg
              .replace(/fill="(?!none")[^"]*"/g, 'fill="currentColor"')
              .replace(/stroke="(?!none")[^"]*"/g, 'stroke="currentColor"')
          ),
        },
      }),
      Components({
        resolvers: [
          ElementPlusResolver({ importStyle: 'css' }),
          // 图标标签解析：只放行 ep / tabler / app 三个集合，
          // 写错集合名/图标名的 i-* 标签不被解析 → 构建期虚拟模块解析失败直接报错
          IconsResolver({
            prefix: 'i',
            enabledCollections: ['ep', 'tabler'],
            customCollections: ['app'],
          }),
        ],
        // 声明要自动导入的全局组件 —— 目录下所有 .vue（deep: true 含任意深度子目录）
        // 均注册到 vue.GlobalComponents，消费方模板直接用 <BaseChart /> / <ProTable /> /
        // <XForm /> 等，不要显式 import（CLAUDE.md §1.7 强约束）
        // P1-1 过渡态：UI 包目录不存在被 filter 掉，实际只扫 appRoot/src/components
        // （deep 扫描覆盖其下 common/ProTable/form-schema 三个子目录，与历史三目录形态等价）；
        // P1-4 组件迁入 @vv/ui 后三个包目录自动生效
        dirs: [
          path.join(UI_SRC_DIR, 'components/common'),
          path.join(UI_SRC_DIR, 'components/ProTable'),
          path.join(UI_SRC_DIR, 'components/form-schema'),
          path.join(appRoot, 'src/components'),
        ].filter((dir) => existsSync(dir)),
        deep: true,
        dts: path.join(appRoot, 'src/types/components.d.ts'),
      }),
      // mock 启用开关由 VITE_USE_MOCK 控制（2026-07-27 切换）。
      // dev 默认开启：用户 clone 后未建 .env 时，VITE_USE_MOCK=undefined，
      // `!== 'false'` 判定为 true；联调真实后端在 .env.development 设 VITE_USE_MOCK=false。
      // mockPath 为绝对路径（vite-plugin-mock 以 isAbsPath 判定，dist/index.mjs:224）
      ...(mockPath
        ? [
            viteMockServe({
              mockPath,
              enable: process.env.VITE_USE_MOCK !== 'false',
              watchFiles: true,
            }),
            // 清理 vite-plugin-mock 在 mock/ 生成的 _*.bundled_*.mjs 临时文件；
            // 必须显式传 mockPath——dev cwd 是 app 目录，cwd 相对解析会静默空转
            cleanMockBundled(mockPath),
          ]
        : []),
      ...extraPlugins,
    ],
    define: {
      'import.meta.env.VITE_APP_ID': JSON.stringify(appName),
    },
    server: {
      ...SERVER_DEFAULTS,
      port: SERVER_DEFAULTS.port + portOffset,
      // 联调真实后端时在 proxy.ts 内按需补充 _env 字段解析（当前返回 {} 占位）
      proxy: createProxyConfig(process.env),
    },
    // legacyRoot 传 appRoot 自身：packages/shared、packages/ui 落地前回落 app 旧位置
    resolve: { alias: createAppAliases(appRoot, appRoot) },
    css: {
      // h5 rem 适配（postcss-pxtorem）：enableRem=true 时仅转换 appRoot/src 下
      // layouts/h5 与 modules/h5-*（见 postcss.ts）；false 时零插件
      postcss: { plugins: createPostcssPlugins({ appRoot, enableRem: h5Rem }) },
      preprocessorOptions: {
        // additionalData 注入到每个 <style lang="scss"> / .scss 文件开头，让 bem mixin
        // 通过 $BEM_PREFIX 自动拼前缀；与 src/utils/bem.ts 的 import.meta.env.VITE_BEM_PREFIX
        // 共享同一来源（环境变量，未设置时回退 'vv' 保持向后兼容）。
        //
        // 关键技术点：sass 的 @use 模块化语义要求「变量只在 module 内部定义」，用 with 语法
        // 把变量值注入到 bem 模块内部的 !default 兜底；调用方文件不要再写 @use 'bem'，
        // 避免重复引入——由本 additionalData 统一引入。
        //
        // silenceDeprecations（'new-global' / 'if-function'）原因见 scss.ts。
        //
        // R-B：bemPath 用绝对路径（包化后 cwd 不再是注入参照系）；P1-4 迁入 @vv/ui 后改指包内路径
        scss: createScssPreprocessorOptions({
          bemPath: path.join(appRoot, 'src/assets/styles/mixins/bem'),
        }),
        less: { javascriptEnabled: true },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        // 显式启用 tree-shaking（true = rolldown 默认推荐配置）
        // 注：Vite 8 用 rolldown 替代 rollup，类型只接受 boolean | TreeshakingOptions，
        // 不再支持 'recommended' 字符串；需精细化定制（manualPureFunctions / moduleSideEffects
        // 等）时改 TreeshakingOptions 对象，字段说明见 @rolldown/types
        treeshake: true,
        output: {
          // ===== 产物文件分类输出：js / css / img 分目录，其它资源归 assets/ =====
          // 目的：dist 目录结构清晰，运维可按目录维度排查问题 + CDN 按目录配置差异化缓存策略
          // 注：rolldown 兼容 rollup 的 entryFileNames / chunkFileNames / assetFileNames 语义
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames(assetInfo) {
            // 按资源扩展名分目录：css → css/；常见图片 → img/；字体等其它资源 → assets/
            // 注：rolldown 的 PreRenderedAsset.name 已 @deprecated，改用 names 数组（取首个原始文件名判定）
            const assetName = assetInfo.names[0] ?? ''
            if (assetName.endsWith('.css')) return 'css/[name]-[hash][extname]'
            const IMG_EXTENSIONS = [
              '.png',
              '.jpg',
              '.jpeg',
              '.gif',
              '.svg',
              '.webp',
              '.ico',
              '.bmp',
              '.avif',
              '.tiff',
              '.apng',
            ]
            if (IMG_EXTENSIONS.some((ext) => assetName.endsWith(ext)))
              return 'img/[name]-[hash][extname]'
            return 'assets/[name]-[hash][extname]'
          },
          // 手动拆分第三方库（vendor chunk）→ 利用浏览器强缓存
          // 业务代码 (src/) 变化时只更新业务 chunk，第三方库 chunk 命中缓存
          // 注：Vite 8 用 rolldown 替代 rollup，manualChunks 必须是函数（不能是对象）
          manualChunks(id) {
            // 业务代码不归 vendor
            if (!id.includes('node_modules')) return undefined
            // VENDOR_CHUNKS 来自 vendor-chunks.ts —— 顺序敏感（vue → ui → charts），
            // 先匹配先返回，新加组必须 append 到末尾
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
}
