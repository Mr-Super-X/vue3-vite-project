<script setup lang="ts">
import { useUserStore } from '@/store/modules/user'
const userStore = useUserStore()
</script>

<template>
  <div class="header-content flex-between">
    <span>{{ userStore.profile?.name ?? '游客' }}</span>
    <el-button text @click="userStore.logout">退出</el-button>
  </div>
</template>

<style scoped>
.header-content {
  padding: 0 var(--spacing-md);
  height: 100%;
}
</style>
