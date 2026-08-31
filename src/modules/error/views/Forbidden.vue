<script setup lang="ts">
// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('forbidden')
</script>

<template>
  <div :class="bem.b()">
    <el-result icon="warning" title="403" sub-title="无权访问此页面" />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-forbidden {
  padding: 24px;
}
</style>
