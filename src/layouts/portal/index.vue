<script setup lang="ts">
import PortalTopBar from './components/PortalTopBar.vue'
import PortalHeaderNav from './components/PortalHeaderNav.vue'
import PortalFooter from './components/PortalFooter.vue'
import PortalAiWidget from './components/PortalAiWidget.vue'
</script>

<template>
  <div class="portal-layout">
    <PortalTopBar />
    <PortalHeaderNav />
    <main class="portal-layout__main">
      <!-- 内容区由路由决定（RouterView 即为默认 slot，未来 portal 子页可复用同一壳） -->
      <RouterView />
    </main>
    <PortalFooter />
    <PortalAiWidget />
  </div>
</template>

<style lang="scss">
/*
  注入portal-layout组件的全局样式变量（主题色、间距、圆角、尺寸、字体、阴影、动画等等），
  注意： 这里不能给style加scoped，否则portal-layout组件的子组件无法使用这些变量
*/
@use './styles/portal-tokens.scss' as *;
</style>

<style lang="scss" scoped>
.portal-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--portal-bg);

  &__main {
    max-width: var(--portal-max-width);
    width: 100%;
    margin: 0 auto;
    padding: 24px var(--spacing-lg);
    flex: 1;
  }
}
</style>
