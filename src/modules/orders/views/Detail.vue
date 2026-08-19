<script setup lang="ts">
// 订单详情页（演示动态路由参数 :id）
const route = useRoute()

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('orders-detail')
</script>

<template>
  <div :class="bem.b()">
    <h2>订单详情</h2>
    <p>
      动态参数：
      <code>{{ route.params.id }}</code>
    </p>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-orders-detail {
  padding: 24px;
}
</style>
