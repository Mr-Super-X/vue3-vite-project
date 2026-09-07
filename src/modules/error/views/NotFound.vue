<script setup lang="ts">
/**
 * 404 页面不存在页（catch-all 兜底 + 手动访问 /404）。
 *
 * @see [`../../router/index.ts`](../../router/index.ts) catch-all 注册
 * @see [`../routes/index.ts`](../routes/index.ts) 路由 /404
 * @group 业务模块：Error
 */
// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('not-found')
</script>

<template>
  <div :class="bem.b()">
    <el-result icon="info" title="404" sub-title="页面不存在" />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-not-found {
  padding: 24px;
}
</style>
