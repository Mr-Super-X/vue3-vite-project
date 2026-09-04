<script setup lang="ts">
// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('hot-search-tags')

defineProps<{
  tags: string[]
  active?: string
}>()

defineEmits<{
  (e: 'select', tag: string): void
}>()
</script>

<template>
  <div :class="bem.b()">
    <span :class="bem.e('label')">热门搜索：</span>
    <button
      v-for="tag in tags"
      :key="tag"
      type="button"
      :class="[bem.e('tag'), bem.is('active', tag === active)]"
      @click="$emit('select', tag)"
    >
      {{ tag }}
    </button>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-hot-search-tags {
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

    &.is-active {
      background: #016be6;
      color: #fff;
    }
  }
}
</style>
