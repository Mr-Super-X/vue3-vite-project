<script setup lang="ts">
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
