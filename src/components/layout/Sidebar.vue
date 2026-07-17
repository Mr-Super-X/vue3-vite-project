<script setup lang="ts">
import { useAppStore } from '@/store/modules/app'
const appStore = useAppStore()
</script>

<template>
  <div class="sidebar-content">
    <h1 v-if="!appStore.sidebarCollapsed">应急水利</h1>
    <button @click="appStore.toggleSidebar">折叠</button>
  </div>
</template>

<style scoped>
.sidebar-content { padding: var(--spacing-md); }
</style>