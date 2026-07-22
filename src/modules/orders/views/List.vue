<script setup lang="ts">
// 订单列表页（演示多级菜单第二级 + 权限码 orders:view）
//
// 注：占位组件，不演示具体业务逻辑。
// 菜单路径：/orders/list（一级菜单 Orders 下的二级页面）
</script>

<template>
  <div class="orders-list">
    <h2>订单列表</h2>
    <p>多级菜单示例：一级菜单 Orders 下的列表页。</p>
    <p>
      权限码：
      <code>orders:view</code>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.orders-list {
  padding: 24px;
}
</style>
