<script setup lang="ts">
/**
 * 三栏 demo 文档布局（对标 element-plus 官网）
 *
 * 布局：grid 三列 [sidebar | main | toc]
 *   - 左侧 sidebar：自动从 router 收集所有 Demo* 路由，**零手动维护**——
 *     新增 demo 子路由后 sidebar 自动出现。当前所有 demo 平铺在一个"通用"组。
 *     顶部有"返回首页"按钮，点击回到项目根路由（dashboard /）。
 *   - 中间 main：演示页内容（default slot）
 *   - 右侧 toc：本页锚点导航（toc slot，由各 demo 页面提供）
 *
 * 边界：sidebar 在内容超长时保持 sticky；toc 同理。
 */
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import { useAppRouter } from '@composables/useAppRouter'

const route = useRoute()
const { router } = useAppRouter()

interface SidebarItem {
  name: string
  title: string
  path: string
}

const sidebarItems = computed<SidebarItem[]>(() => {
  return (
    router
      .getRoutes()
      // 排除 redirect 路由（'Demo' 这种跳转型入口不应出现在侧边栏）
      .filter((r) => typeof r.name === 'string' && r.name.startsWith('Demo') && !r.redirect)
      .map((r) => ({
        name: String(r.name),
        title: String(r.meta?.title ?? r.name),
        path: r.path,
      }))
  )
})

/** 回到项目根路由（/）。 */
function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="doc-layout">
    <aside class="doc-layout__sidebar">
      <button class="doc-layout__home" type="button" @click="goHome">
        <el-icon class="doc-layout__home-icon"><Back /></el-icon>
        <span>返回首页</span>
      </button>
      <h3 class="doc-layout__group-title">组件</h3>
      <ul class="doc-layout__nav">
        <li v-for="item in sidebarItems" :key="item.name">
          <RouterLink
            :to="item.path"
            class="doc-layout__link"
            :class="{ 'is-active': route.name === item.name }"
          >
            {{ item.title }}
          </RouterLink>
        </li>
      </ul>
    </aside>

    <main class="doc-layout__main">
      <slot />
    </main>

    <aside class="doc-layout__toc">
      <slot name="toc" />
    </aside>
  </div>
</template>

<style lang="scss" scoped>
.doc-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 180px;
  gap: 24px;
  align-items: start;
  // 强制占满视口高度（减去 default-layout 的 64px header + 上下 padding），
  // 避免 demo 内容少时容器塌陷导致 sidebar / toc 看起来"居中"——
  // 也保证切换路由时容器高度不变，sticky sidebar / toc 不会因为高度差抖动。
  min-height: calc(100vh - 96px);

  &__sidebar,
  &__toc {
    position: sticky;
    top: 16px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
  }

  &__home {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-bottom: 16px;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: 4px;
    color: #606266;
    font-size: 13px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;

    &:hover {
      background: #f5f7fa;
      color: #409eff;
      border-color: #409eff;
    }
  }

  &__home-icon {
    font-size: 14px;
  }

  &__group-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__nav {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__link {
    display: block;
    padding: 6px 12px;
    margin: 2px 0;
    font-size: 13px;
    color: #606266;
    text-decoration: none;
    border-radius: 4px;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: #f5f7fa;
      color: #409eff;
    }

    &.is-active {
      background: #ecf5ff;
      color: #409eff;
      font-weight: 500;
    }
  }
}
</style>
