<script setup lang="ts">
import { useRoute } from 'vue-router'

// 订单详情页（演示动态路由参数 :id）
const route = useRoute()
</script>

<template>
  <div class="orders-detail">
    <h2>订单详情</h2>
    <p>
      动态参数：
      <code>{{ route.params.id }}</code>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.orders-detail {
  padding: 24px;
}
</style>
