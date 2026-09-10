<script setup lang="ts">
/**
 * 主内容区（复刻参考仓 AppView）：keep-alive 路由出口 + 页签刷新机制 + 页脚。
 *
 * 刷新机制说明：参考仓用 /redirect 路由重定向实现页签刷新（需新增全局路由），
 * 本项目用"剔除 keep-alive 缓存 + 重建组件 key"实现，自包含不污染路由表：
 * 1. TagsView 刷新 → store.removeCachedView(name) 把当前页移出 include 列表
 * 2. 布局壳（default/index.vue）注入的 refreshKey 递增 → 组件 key 变化重新挂载
 * 3. 旧缓存实例因 include 不再匹配被 keep-alive 自动清理
 *
 * provide 在布局壳而非本组件：TagsView 与 AppView 是平级兄弟，AppView provide
 * 时 TagsView inject 不到（@see ../index.vue 的刷新机制注释）
 *
 * @see [`./TagsView.vue`](./TagsView.vue) 刷新命令发起方
 * @see [`../index.vue`](../index.vue) refreshKey / refresh 句柄 provide 方
 * @see [`@/store/modules/tags-view`](../../../store/modules/tags-view.ts) cachedViews
 * @group 布局：Default
 */
import { useTagsViewStore } from '@/store/modules/tags-view'
import { defaultLayoutConfig } from '../config/app'
import Footer from './Footer.vue'

const bem = createNamespace('app-view')

const route = useRoute()
const tagsViewStore = useTagsViewStore()

const cachedViews = computed(() => tagsViewStore.cachedViews)

/** 刷新计数（布局壳注入）：页签"刷新"命令时递增，强制当前路由组件重新挂载 */
const refreshKey = inject<Ref<number>>('default-layout-refresh-key', ref(0))
</script>

<template>
  <section :class="bem.b()">
    <div :class="bem.e('content')">
      <RouterView v-slot="{ Component }">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="`${route.fullPath}:${refreshKey}`" />
        </keep-alive>
      </RouterView>
    </div>
    <Footer v-if="defaultLayoutConfig.ui.footer" />
  </section>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-app-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  &__content {
    flex: 1;
    padding: var(--app-content-padding);
    // 短内容页铺满视口剩余高度（扣除顶栏工具条 + 页签条 + 页脚），页脚恰好沉底
    // 可见、无需滚动；页脚是否渲染由 defaultLayoutConfig.ui.footer 控制，未渲染时
    // 多扣的 50px 仅留少量空白，不破坏布局
    min-height: calc(
      100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height)
    );
    background: var(--app-content-bg-color);
    box-sizing: border-box;
  }
}
</style>
