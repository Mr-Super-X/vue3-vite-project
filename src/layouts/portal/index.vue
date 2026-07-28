<script setup lang="ts">
// PortalLayout：限定门户专用头部 + 路由出口
// 职责：只负责头部（由 PortalHeader 单组件承担，含品牌区与导航区），以及一行内边距留空。
//      导航以下的所有内容（首页 hero、时间问候、数据总览、底部、AI 助手等）由 home 模块自管。
import PortalHeader from './components/PortalHeader.vue'
</script>

<template>
  <div class="portal-layout">
    <PortalHeader />
    <main class="portal-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss">
// 非 scoped：portal-tokens 提供的 CSS 变量需对子组件可见
@use './styles/portal-tokens.scss' as *;
</style>

<style lang="scss" scoped>
.portal-layout {
  min-height: 100vh;
  background: var(--portal-bg);
  display: flex;
  flex-direction: column;

  &__main {
    flex: 1;
    width: 100%;
  }
}
</style>
