<script setup lang="ts">
/**
 * 500 服务器内部错误页（守卫捕获异常后跳此路由）。
 *
 * @see [`../../router/guards/auth`](../../router/guards/auth.ts) 守卫消费方
 * @see [`../routes/index.ts`](../routes/index.ts) 路由 /500
 * @group 业务模块：Error
 */
// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('server-error')
</script>

<template>
  <div :class="bem.b()">
    <el-result icon="error" title="500" sub-title="服务器开小差了" />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-server-error {
  padding: 24px;
}
</style>
