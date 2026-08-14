<script setup lang="ts">
import { useUserStore } from '@/store/modules/user'
import { useLogout } from '@/composables/useLogout'

const userStore = useUserStore()
// 运行时 BEM 命名空间：生成 vv-header-bar / vv-header-bar__user / vv-header-bar__action / is-logged-out
// 与 <style> 块的 SCSS mixin 命名完全对齐，便于阅读与维护。
const bem = createNamespace('header-bar')
const { loggingOut, confirmLogout } = useLogout()
</script>

<template>
  <div :class="[bem.b(), 'flex-between', bem.is('logged-out', !userStore.isLoggedIn)]">
    <span :class="bem.e('user')">
      {{ userStore.profile?.name ?? '游客' }}
    </span>
    <el-button :class="bem.e('action')" text :loading="loggingOut" @click="confirmLogout">
      退出
    </el-button>
  </div>
</template>

<style lang="scss">
// 命名空间 vv-header-bar：与 createNamespace('header-bar') 运行时拼接的类名完全对齐。
// - SCSS mixin：编译期拼接 CSS（静态样式）
// - 运行时 BEM：JS 字符串拼接（动态 :class 切换）
// 两套工具使用同一套类名，互不冲突。
//
// 前缀由 vite.config.ts 通过 additionalData 注入 $BEM_PREFIX，默认 'vv'。
// 想改全站类名前缀：改 .env 中的 VITE_BEM_PREFIX 即可，TS/JS 与 SCSS 同步生效。
.#{$BEM_PREFIX}-header-bar {
  padding: 0 var(--spacing-md);
  height: 100%;

  &__user {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  // Element Plus 组件：依赖 .vv-header-bar__action BEM 命名空间隔离（无需 :deep()）
  &__action {
    .el-button {
      padding: 4px 12px;
    }
  }

  &.is-logged-out {
    .#{$BEM_PREFIX}-header-bar__user {
      color: var(--el-text-color-placeholder);
    }
  }
}
</style>
