<script setup lang="ts">
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
