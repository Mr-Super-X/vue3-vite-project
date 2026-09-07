<script setup lang="ts">
/**
 * Default 布局（侧边栏 + 顶部 + 多页签 + 主内容）。
 *
 * 用途：所有需要完整后台框架的页面（用户管理、订单管理等业务模块）。
 * 路由 meta.layout === 'default'（或不指定）的路由会使用本布局。
 *
 * 关键设计：
 * - 侧边栏宽度：跟随 `appStore.sidebarCollapsed` 切换
 * - 多页签：`<keep-alive :include="cachedViews">` 缓存已访问页面，避免重复渲染
 * - Grid 布局：sidebar / header / nav / main 四区严格定位
 *
 * @see [`../blank/index.vue`](../blank/index.vue) 空白布局
 * @see [`./components/Header.vue`](./components/Header.vue) 顶部
 * @see [`./components/Sidebar.vue`](./components/Sidebar.vue) 侧边栏
 * @see [`@/components/common/TagsView/index.vue`](../../components/common/TagsView/index.vue) 多页签
 * @see [`@/store/modules/tags-view.ts`](../../store/modules/tags-view.ts) 缓存视图来源
 * @group 布局
 */
import { useAppStore } from '@/store/modules/app'
import { useTagsViewStore } from '@/store/modules/tags-view'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import TagsView from '@/components/common/TagsView/index.vue'
const appStore = useAppStore()
const tagsViewStore = useTagsViewStore()
const cachedViews = computed(() => tagsViewStore.cachedViews)

// 运行时 BEM 命名空间：vv-default-layout
const bem = createNamespace('default-layout')
</script>

<template>
  <div :class="bem.b()">
    <aside :class="[bem.e('sidebar'), bem.is('collapsed', appStore.sidebarCollapsed)]">
      <Sidebar />
    </aside>
    <header :class="bem.e('header')">
      <Header />
    </header>
    <nav :class="bem.e('nav')">
      <TagsView />
    </nav>
    <main :class="bem.e('main')">
      <RouterView v-slot="{ Component }">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="$route.fullPath" />
        </keep-alive>
      </RouterView>
    </main>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-default-layout {
  display: grid;
  grid-template-areas: 'sidebar header' 'sidebar nav' 'sidebar main';
  grid-template-columns: auto 1fr;
  grid-template-rows: var(--header-height) var(--tags-view-height, 36px) 1fr;
  height: 100vh;

  &__sidebar {
    grid-area: sidebar;
    width: var(--sidebar-width);
    background: #001529;
    color: #fff;

    &.is-collapsed {
      width: var(--sidebar-collapsed-width);
    }
  }

  &__header {
    grid-area: header;
    border-bottom: 1px solid #eee;
  }

  &__nav {
    grid-area: nav;
  }

  &__main {
    grid-area: main;
    padding: var(--spacing-md);
    overflow: auto;
  }
}
</style>
