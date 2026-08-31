<script setup lang="ts">
/**
 * 三栏 demo 文档布局（对标 element-plus 官网）
 *
 * 布局：grid 三列 [sidebar | main | toc]
 *   - 左侧 sidebar：自动从 router 收集所有 Demo* 路由，**零手动维护**——
 *     新增 demo 子路由后 sidebar 自动出现。按组件类型分组（分组规则与中文名
 *     映射见 config/sidebar-groups.ts），组可点击展开收起，右缘可拖拽调整宽度
 *     （150~400px，逻辑见 use-sidebar-drag.ts）。
 *     顶部有"返回首页"按钮，点击回到项目根路由（dashboard /）。
 *   - 中间 main：演示页内容（default slot）
 *   - 右侧 toc：本页锚点导航（toc slot，由各 demo 页面提供）
 *
 * 边界：sidebar 在内容超长时保持 sticky；toc 同理。
 */
import { ArrowDown, ArrowRight, Back } from '@element-plus/icons-vue'
import { useAppRouter } from '@composables/useAppRouter'
import { getSidebarGroup, getSidebarLabel, SIDEBAR_GROUPS } from '../config/sidebar-groups'
import { collapsedGroups, sidebarWidth } from './sidebar-state'
import { useSidebarDrag } from './use-sidebar-drag'

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

// —— 分组归类（空组过滤掉，不渲染） ——
interface SidebarGroup {
  title: string
  items: SidebarItem[]
}

const sidebarGroups = computed<SidebarGroup[]>(() => {
  const map = new Map<string, SidebarItem[]>()
  for (const group of SIDEBAR_GROUPS) map.set(group.title, [])
  for (const item of sidebarItems.value) {
    map.get(getSidebarGroup(item.title))?.push(item)
  }
  return SIDEBAR_GROUPS.map((g) => ({ title: g.title, items: map.get(g.title) ?? [] })).filter(
    (g) => g.items.length > 0
  )
})

// —— 展开收起（默认全展开；状态模块级保留，见 sidebar-state.ts） ——
function toggleGroup(groupTitle: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(groupTitle)) {
    next.delete(groupTitle)
  } else {
    next.add(groupTitle)
  }
  collapsedGroups.value = next
}

// —— 拖拽调整 sidebar 宽度（150~400px 钳制；状态模块级保留，逻辑见 use-sidebar-drag） ——
const { onResizerMousedown } = useSidebarDrag(sidebarWidth, 150, 400)

const bem = createNamespace('doc-layout')
</script>

<template>
  <div
    :class="bem.b()"
    :style="{ gridTemplateColumns: `${sidebarWidth}px 0 minmax(0, 1fr) 180px` }"
  >
    <aside :class="bem.e('sidebar')">
      <button :class="bem.e('home')" type="button" @click="goHome">
        <el-icon :class="bem.e('home-icon')"><Back /></el-icon>
        <span>返回首页</span>
      </button>
      <ul :class="bem.e('nav')">
        <li v-for="group in sidebarGroups" :key="group.title" :class="bem.e('group')">
          <button
            :class="bem.e('group-header')"
            type="button"
            :aria-expanded="!collapsedGroups.has(group.title)"
            @click="toggleGroup(group.title)"
          >
            <el-icon :class="bem.e('group-arrow')">
              <ArrowRight v-if="collapsedGroups.has(group.title)" />
              <ArrowDown v-else />
            </el-icon>
            <span :class="bem.e('group-name')">{{ group.title }}</span>
            <span :class="bem.e('group-count')">{{ group.items.length }}</span>
          </button>
          <ul v-show="!collapsedGroups.has(group.title)" :class="bem.e('group-list')">
            <li v-for="item in group.items" :key="item.name">
              <RouterLink
                :to="item.path"
                :class="[bem.e('link'), bem.is('active', route.name === item.name)]"
              >
                {{ getSidebarLabel(item.title) }}
              </RouterLink>
            </li>
          </ul>
        </li>
      </ul>
    </aside>

    <!-- 拖拽条放在 sidebar 与 main 之间的独立 grid 列，sticky 定位保证滚动时始终可见 -->
    <div :class="bem.e('resizer')" @mousedown="onResizerMousedown" />

    <main :class="bem.e('main')">
      <slot />
    </main>

    <aside :class="bem.e('toc')">
      <slot name="toc" />
    </aside>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-doc-layout {
  // grid-template-columns 由内联 style 动态控制（sidebar 宽度可拖拽）
  // 四列：[sidebar | resizer(0宽) | main | toc]
  display: grid;
  gap: 0;
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
    padding: 16px;
  }

  &__toc {
    margin-left: 24px;
  }

  &__main {
    padding: 16px;
    margin-left: 24px;
  }

  &__home {
    // sticky 定位：sidebar 内容超长滚动时始终可见
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-bottom: 16px;
    padding: 6px 10px;
    background: var(--el-bg-color, #fff);
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

  &__nav {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__group {
    margin-bottom: 4px;
  }

  &__group-header {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 6px 8px;
    background: transparent;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #909399;
    cursor: pointer;

    &:hover {
      background: #f5f7fa;
      color: #606266;
    }
  }

  &__group-arrow {
    flex-shrink: 0;
    font-size: 12px;
  }

  &__group-name {
    flex: 1;
    text-align: left;
  }

  &__group-count {
    flex-shrink: 0;
    font-size: 11px;
    color: #c0c4cc;
  }

  &__group-list {
    margin: 0;
    padding: 0 0 0 8px;
    list-style: none;
  }

  &__resizer {
    // 独立 grid 列，sticky 定位保证 sidebar 内部滚动或页面滚动时始终可见
    position: sticky;
    top: 16px;
    align-self: start;
    justify-self: end;
    z-index: 1;
    width: 6px;
    height: calc(100vh - 32px);
    cursor: col-resize;

    &:hover {
      background: rgba(64, 158, 255, 0.3);
    }
  }

  &__link {
    display: block;
    // 长组件名（如 XFormCrossFieldReverse）在窄 sidebar 下允许断词，避免撑出横向滚动
    overflow-wrap: break-word;
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
