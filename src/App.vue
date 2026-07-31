<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouterStore } from '@store/modules/router'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AsyncState from '@/components/common/AsyncState.vue'

const routerStore = useRouterStore()
const { isLoadingRemoteMenu } = storeToRefs(routerStore)
</script>

<template>
  <ErrorBoundary>
    <!--
      remote 模式首次进入时，守卫在后台拉取菜单，
      用 AsyncState 包裹 RouterView 显示 Loading 骨架屏，
      避免用户看到空白页
    -->
    <AsyncState :loading="isLoadingRemoteMenu" :error="null" :is-empty="false">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </AsyncState>
  </ErrorBoundary>
</template>

<style>
/* 路由过渡动画（全局 fade 效果，与 transition.scss 中 @keyframes vv-fade-in 配合） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
