<script setup lang="ts">
/**
 * 头部语言切换下拉（复刻参考仓 LocaleDropdown，接项目 appStore.locale）。
 *
 * 项目 i18n 实例通过 watch appStore.locale 同步（见 store/modules/app），
 * 本组件只负责写入 setLocale。
 *
 * @see [`@/store/modules/app`](../../../store/modules/app.ts) locale / setLocale
 * @group 布局：Default
 */
import { ArrowDown } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/modules/app'

const bem = createNamespace('locale-dropdown')

const appStore = useAppStore()

const OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
] as const

function onCommand(value: string) {
  if (value === 'zh-CN' || value === 'en-US') {
    appStore.setLocale(value)
  }
}
</script>

<template>
  <el-dropdown :class="bem.b()" trigger="click" @command="onCommand">
    <button :class="bem.e('trigger')" type="button" aria-label="切换语言">
      <span :class="bem.e('current')">{{ appStore.locale === 'zh-CN' ? '中文' : 'En' }}</span>
      <el-icon :size="12"><ArrowDown /></el-icon>
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="opt in OPTIONS"
          :key="opt.value"
          :command="opt.value"
          :class="bem.is('selected', appStore.locale === opt.value)"
        >
          {{ opt.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-locale-dropdown {
  height: 100%;

  &__trigger {
    display: flex;
    gap: 4px;
    align-items: center;
    height: 100%;
    padding: 0 10px;
    color: var(--top-header-text-color);
    cursor: pointer;
    background: transparent;
    border: 0;

    &:hover,
    &:focus-visible {
      color: var(--el-color-primary);
      background: var(--top-header-hover-color);
      outline: none;
    }
  }

  &__current {
    font-size: 13px;
  }
}
</style>
