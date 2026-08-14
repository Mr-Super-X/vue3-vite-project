<script setup lang="ts">
import type { SearchTypeOption } from '@/modules/home/config/types'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('search-bar')

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
  <div :class="bem.b()">
    <select
      :class="bem.e('select')"
      :value="modelValueType"
      @change="emit('update:modelValueType', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="t in types" :key="t.value" :value="t.value">
        {{ t.label }}
      </option>
    </select>
    <span :class="bem.e('divider')" aria-hidden="true" />
    <input
      :class="bem.e('input')"
      :value="modelValueKeyword"
      :placeholder="placeholder"
      @input="emit('update:modelValueKeyword', ($event.target as HTMLInputElement).value)"
    />
    <button type="button" :class="bem.e('btn')" :disabled="!canSubmit()" @click="onSubmit">
      搜索
    </button>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-search-bar {
  display: flex;
  align-items: stretch;
  width: 874px;
  height: 56px;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;

  &__select {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0 12px 0 14px;
    font-size: 14px;
    color: #727475;
    cursor: pointer;
    min-width: 80px;
  }

  &__divider {
    width: 1px;
    align-self: center;
    height: 20px;
    background: #d8d8d8;
  }

  &__input {
    flex: 1;
    border: none;
    outline: none;
    padding: 0 16px;
    font-size: 14px;
    color: #303133;
    background: transparent;

    &::placeholder {
      color: #727475;
    }
  }

  &__btn {
    width: 74px;
    background: rgba(1, 107, 230, 0.6);
    color: #fff;
    border: none;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) {
      background: #016be6;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>
