<script setup lang="ts">
/**
 * 应用根组件（docs demo 文档站最小壳）。
 *
 * 相对 admin App.vue 的裁剪：无远程菜单骨架（docs 无远程菜单）、
 * 无 locale 跟随 appStore 同步（demo 站无语言切换入口，固定 zh-cn
 * 保证 Element Plus 组件中文文案，与 demo 在 admin 内的渲染口径一致）。
 *
 * ErrorBoundary / ElConfigProvider 均为全局自动注册组件
 * （unplugin-vue-components 扫 @vv/ui + ElementPlusResolver），模板零 import。
 *
 * @see [`./router`](./router/index.ts) 路由配置
 * @group 应用根
 */
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 与 admin App.vue 同口径：locale 中文 + 默认尺寸 + 按钮两字间距，
// 保证 demo 从 admin 迁来后渲染无视觉漂移。
// admin 侧经 computed<Record<string, unknown>> 声明规避 ElConfigProvider 的
// ConfigProviderContext 精确类型约束；docs 静态对象照抄该形态
const elementConfig: Record<string, unknown> = {
  locale: zhCn,
  size: 'default',
  button: { autoInsertSpace: true },
}
</script>

<template>
  <ElConfigProvider v-bind="elementConfig">
    <ErrorBoundary>
      <RouterView />
    </ErrorBoundary>
  </ElConfigProvider>
</template>
