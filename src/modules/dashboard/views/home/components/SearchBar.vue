<script setup lang="ts">
import type { SearchTypeOption } from '@/portal/config/types'

const props = defineProps<{
  types: SearchTypeOption[]
  modelValueType: string
  modelValueKeyword: string
  placeholder?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValueType', v: string): void
  (e: 'update:modelValueKeyword', v: string): void
  (e: 'submit'): void
}>()

const canSubmit = (): boolean => !props.loading && props.modelValueKeyword.trim().length > 0

function onSubmit(): void {
  if (canSubmit()) emit('submit')
}
</script>

<template>
  <div class="search-bar">
    <select
      class="search-bar__select"
      :value="modelValueType"
      @change="emit('update:modelValueType', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="t in types" :key="t.value" :value="t.value">
        {{ t.label }}
      </option>
    </select>
    <input
      class="search-bar__input"
      :value="modelValueKeyword"
      :placeholder="placeholder"
      @input="emit('update:modelValueKeyword', ($event.target as HTMLInputElement).value)"
    />
    <button type="button" class="search-bar__btn" :disabled="!canSubmit()" @click="onSubmit">
      搜索
    </button>
  </div>
</template>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  gap: 8px;
  align-items: center;

  &__select {
    height: 40px;
    padding: 0 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  &__input {
    flex: 1;
    height: 40px;
    padding: 0 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  &__btn {
    height: 40px;
    padding: 0 24px;
    background: #409eff;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:disabled {
      background: #a0cfff;
      cursor: not-allowed;
    }
  }
}
</style>
