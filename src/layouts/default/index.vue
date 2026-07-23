<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { useTagsViewStore } from '@/store/modules/tags-view'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import TagsView from '@/components/common/TagsView/index.vue'
const appStore = useAppStore()
const tagsViewStore = useTagsViewStore()
const cachedViews = computed(() => tagsViewStore.cachedViews)
</script>

<template>
  <div class="default-layout">
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <Sidebar />
    </aside>
    <header class="header">
      <Header />
    </header>
    <nav class="nav">
      <TagsView />
    </nav>
    <main class="main">
      <RouterView v-slot="{ Component }">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="$route.fullPath" />
        </keep-alive>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.default-layout {
  display: grid;
  grid-template-areas: 'sidebar header' 'sidebar nav' 'sidebar main';
  grid-template-columns: auto 1fr;
  grid-template-rows: var(--header-height) var(--tags-view-height, 36px) 1fr;
  height: 100vh;
}
.sidebar {
  grid-area: sidebar;
  width: var(--sidebar-width);
  background: #001529;
  color: #fff;
}
.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}
.header {
  grid-area: header;
  border-bottom: 1px solid #eee;
}
.nav {
  grid-area: nav;
}
.main {
  grid-area: main;
  padding: var(--spacing-md);
  overflow: auto;
}
</style>
