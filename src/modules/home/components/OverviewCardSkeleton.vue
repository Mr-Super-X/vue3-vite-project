<script setup lang="ts">
// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-card-skeleton')
</script>

<template>
  <div :class="bem.b()" data-test="skeleton" aria-hidden="true">
    <div :class="[bem.e('head'), bem.m('shimmer')]" />
    <div :class="[bem.e('title'), bem.m('shimmer')]" />
    <div v-for="i in 3" :key="i" :class="[bem.e('row'), bem.m('shimmer')]" />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-card-skeleton {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #ebeef5;

  &__head {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }

  &__title {
    height: 16px;
    margin: 12px 0;
    border-radius: 4px;
  }

  &__row {
    height: 32px;
    margin-top: 12px;
    border-radius: 4px;
  }

  &--shimmer {
    background: linear-gradient(90deg, #f2f3f5 25%, #e6e8eb 50%, #f2f3f5 75%);
    background-size: 200% 100%;
    animation: overview-card-skeleton-shimmer 1.4s infinite;
  }
}

@keyframes overview-card-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
