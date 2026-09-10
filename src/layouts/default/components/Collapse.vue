<script setup lang="ts">
/**
 * 侧栏折叠按钮（hamburger）：翻转 appStore.sidebarCollapsed。
 *
 * 复刻参考仓 Collapse：纯按钮 + 图标切换（展开 Fold / 收起 Expand）。
 *
 * @see [`@/store/modules/app`](../../../store/modules/app.ts) sidebarCollapsed
 * @group 布局：Default
 */
import { Expand, Fold } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/modules/app'

const bem = createNamespace('app-collapse')

const appStore = useAppStore()
</script>

<template>
  <button
    :class="bem.b()"
    type="button"
    :aria-label="appStore.sidebarCollapsed ? '展开导航' : '收起导航'"
    @click="appStore.toggleSidebar()"
  >
    <el-icon :size="18">
      <Fold v-if="!appStore.sidebarCollapsed" />
      <Expand v-else />
    </el-icon>
  </button>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-app-collapse {
  display: grid;
  width: var(--top-tool-height);
  height: 100%;
  padding: 0;
  color: var(--top-header-text-color);
  cursor: pointer;
  background: transparent;
  border: 0;
  place-items: center;

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
    background: var(--top-header-hover-color);
    outline: none;
  }
}
</style>
