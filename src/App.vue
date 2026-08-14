<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useRouterStore } from '@store/modules/router'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AsyncState from '@/components/common/AsyncState.vue'

const routerStore = useRouterStore()
const { isLoadingRemoteMenu } = storeToRefs(routerStore)
const route = useRoute()

// 仅"远程菜单加载中 且 当前导航无任何路由匹配"时才显示骨架：
//  - 首次进入（路由待远程注入，matched 为空）→ 必须遮挡，否则白屏
//  - 页面间跳转（如登录页 → 首页，当前页 matched 非空）→ 保持当前页面，
//    避免 AsyncState 把登录页替换成骨架造成闪屏（2026-08-12 修复）
const showRemoteMenuLoading = computed(
  () => isLoadingRemoteMenu.value && route.matched.length === 0
)
</script>

<template>
  <ErrorBoundary>
    <!--
      remote 模式首次进入时，守卫在后台拉取菜单，
      用 AsyncState 包裹 RouterView 显示 Loading 骨架屏，
      避免用户看到空白页
    -->
    <AsyncState :loading="showRemoteMenuLoading" :error="null" :is-empty="false">
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
