<script setup lang="ts">
/**
 * docs 站内联 404（error 模块视图归 admin 私有，跨 app 不可复用，故 docs 自带最小版）。
 * @group 视图：兜底
 */
// 项目 composable @composables/useAppRouter（unplugin-auto-import 全局注入）
const { router } = useAppRouter()
const bem = createNamespace('docs-not-found')
</script>

<template>
  <div :class="bem.b()">
    <h1>404</h1>
    <p>页面不存在或已移除</p>
    <ElButton type="primary" @click="router.push('/demo')">返回组件示例首页</ElButton>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-docs-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
}
</style>
