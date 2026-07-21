<script setup lang="ts">
import { useUserStore } from '@/store/modules/user'
import { createNamespace } from '@utils/bem'

const userStore = useUserStore()
// 运行时 BEM 命名空间：生成 gm-header-bar / gm-header-bar__user / gm-header-bar__action / is-logged-out
// 与 <style> 块的 SCSS mixin 命名完全对齐，便于阅读与维护。
const bem = createNamespace('header-bar')
</script>

<template>
  <div :class="[bem.b(), 'flex-between', bem.is('logged-out', !userStore.isLoggedIn)]">
    <span :class="bem.e('user')">
      {{ userStore.profile?.name ?? '游客' }}
    </span>
    <el-button :class="bem.e('action')" text @click="userStore.logout">退出</el-button>
  </div>
</template>

<style lang="scss" scoped>
// 命名空间 gm-header-bar：与 createNamespace('header-bar') 运行时拼接的类名完全对齐。
// - SCSS mixin：编译期拼接 CSS（静态样式）
// - 运行时 BEM：JS 字符串拼接（动态 :class 切换）
// 两套工具使用同一套类名，互不冲突。
@use '@/assets/styles/mixins/bem' as *;

@include b(gm-header-bar) {
  padding: 0 var(--spacing-md);
  height: 100%;

  @include e(user) {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  // Element Plus 组件需要 :deep() 穿透组件库作用域
  @include e(action) {
    :deep(.el-button) {
      padding: 4px 12px;
    }
  }

  @include is(logged-out) {
    .gm-header-bar__user {
      color: var(--el-text-color-placeholder);
    }
  }
}
</style>
