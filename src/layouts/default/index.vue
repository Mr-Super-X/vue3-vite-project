<script setup lang="ts">
import { useAppStore } from '@/store/modules/app'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
const appStore = useAppStore()
</script>

<template>
  <div class="default-layout">
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <Sidebar />
    </aside>
    <header class="header">
      <Header />
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.default-layout {
  display: grid;
  grid-template-areas: 'sidebar header' 'sidebar main';
  grid-template-columns: auto 1fr;
  grid-template-rows: var(--header-height) 1fr;
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
.main {
  grid-area: main;
  padding: var(--spacing-md);
  overflow: auto;
}
</style>
