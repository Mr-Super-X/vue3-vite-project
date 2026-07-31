<script setup lang="ts">
defineProps<{
  tags: string[]
  active?: string
}>()

defineEmits<{
  (e: 'select', tag: string): void
}>()
</script>

<template>
  <div class="hot-search">
    <span class="hot-search__label">热门搜索：</span>
    <button
      v-for="tag in tags"
      :key="tag"
      type="button"
      :class="['hot-search__tag', { active: tag === active }]"
      @click="$emit('select', tag)"
    >
      {{ tag }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.hot-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 14px;

  &__label {
    color: #262626;
    line-height: 20px;
  }

  &__tag {
    padding: 2px 0;
    background: rgba(0, 0, 0, 0.15);
    border: none;
    border-radius: 2px;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    line-height: 20px;
    min-width: 56px;
    padding: 0 8px;
    height: 24px;

    &.active {
      background: #016be6;
      color: #fff;
    }
  }
}
</style>
