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
  font-size: 13px;

  &__label {
    color: #909399;
  }

  &__tag {
    padding: 4px 12px;
    background: #f0f6ff;
    border: 1px solid #d6e8ff;
    border-radius: 4px;
    color: #409eff;
    cursor: pointer;
    font-size: 13px;

    &.active {
      background: #409eff;
      color: #fff;
    }
  }
}
</style>
