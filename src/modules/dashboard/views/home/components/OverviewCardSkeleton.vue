<template>
  <div class="ov-skeleton" data-test="skeleton" aria-hidden="true">
    <div class="ov-skeleton__head shimmer" />
    <div class="ov-skeleton__title shimmer" />
    <div v-for="i in 3" :key="i" class="ov-skeleton__row shimmer" />
  </div>
</template>

<style lang="scss" scoped>
.ov-skeleton {
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
}

.shimmer {
  background: linear-gradient(90deg, #f2f3f5 25%, #e6e8eb 50%, #f2f3f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
