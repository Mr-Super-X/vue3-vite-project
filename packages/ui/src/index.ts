/**
 * @vv/ui 根 barrel。
 *
 * 当前唯一聚合出口：createGlobalComponents 工厂（app 入口 `app.use(createGlobalComponents())`）。
 *
 * 刻意不聚合：
 * - `./components/**`（组件经 unplugin-vue-components 按目录扫描自动注册，模板零 import；
 *   类型消费走 app 侧 '@components/*' 别名或 '@vv/ui/components/*' 包子路径）
 * - `./composables/{useDialog,useConfirm,useLogout}`（AutoImport 按 '@vv/ui/composables/*'
 *   子路径注入；收进根 barrel 会让全局组件注册插件随任意 import 副作用化）
 * - `./assets/**`（样式/图标为构建期资产，经 '@assets/*' 别名或 scss 入口消费）
 *
 * @group 包出口
 */
export * from './global-components.ts'
