<script setup lang="ts">
/**
 * 应用根组件（auth 统一登录应用最小壳）。
 *
 * 相对 admin App.vue 的裁剪：无远程菜单骨架、无 locale 跟随 appStore 同步
 * （登录页无语言切换入口，固定 zh-cn 保证 Element Plus 组件中文文案）。
 *
 * ErrorBoundary / ElConfigProvider 均为全局自动注册组件
 * （unplugin-vue-components 扫 @vv/ui + ElementPlusResolver），模板零 import。
 *
 * @see [`./router`](./router/index.ts) 路由配置
 * @group 应用根
 */
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 与 admin App.vue 同口径：locale 中文 + 默认尺寸 + 按钮两字间距，
// 保证登录页从 admin 迁来后渲染无视觉漂移。
// admin 侧经 computed<Record<string, unknown>> 声明规避 ElConfigProvider 的
// ConfigProviderContext 精确类型约束；auth 静态对象照抄该形态
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
