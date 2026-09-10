<script setup lang="ts">
/**
 * 递归菜单（复刻参考仓 components/Menu，SFC 递归实现替代其 tsx render 函数）。
 *
 * 行为矩阵：
 * - 单子项提升（resolveSingleChild）：仅一个可见子项且未设 alwaysShow 时，
 *   父菜单"提升"为单菜单项（显示子项标题/图标，路径指向子项）——参考仓标志性行为
 * - 外链：path 为 http(s)/ftp URL 时点击新窗口打开
 * - vertical 模式：跟随 appStore.sidebarCollapsed 折叠（仅显示图标，弹层悬浮）
 * - horizontal 模式：用于 top 布局顶栏导航
 * - 激活项：meta.activeMenu 优先，否则当前路由 path
 * - 手风琴：config.ui.uniqueOpened 仅作用于 vertical
 *
 * 递归说明：内层 AppMenu 复用本文件组件（按文件名自引用），el-menu-item /
 * el-sub-menu 通过 element-plus 的 provide/inject 把 select 事件上报给根
 * el-menu，因此只有根实例绑定 @select。
 *
 * @see [`../config/menu.ts`](../config/menu.ts) buildMenuTree / resolveSingleChild
 * @see [`../config/app.ts`](../config/app.ts) uniqueOpened 开关
 * @group 布局：Default
 */
import type { MenuNode } from '../config/types'
import { isUrl, resolveSingleChild } from '../config/menu'
import { defaultLayoutConfig } from '../config/app'
import { useAppStore } from '@/store/modules/app'
import MenuIcon from './MenuIcon.vue'

const bem = createNamespace('app-menu')

const props = withDefaults(
  defineProps<{
    /** 菜单树（根实例传 buildMenuTree 结果，递归实例传子节点） */
    menuNodes: MenuNode[]
    /** 渲染模式：vertical 侧栏 / horizontal 顶栏 */
    mode?: 'vertical' | 'horizontal'
    /** 内部递归标记：根实例为 false（绑定 select / 渲染滚动容器） */
    isNested?: boolean
  }>(),
  { mode: 'vertical', isNested: false }
)

const appStore = useAppStore()
const route = useRoute()
const { router } = useAppRouter()

/** 折叠仅作用于 vertical 模式 */
const isCollapsed = computed(() => props.mode === 'vertical' && appStore.sidebarCollapsed)

/**
 * 折叠 tooltip 开关：仅根实例生效——折叠态下图标是唯一可见内容，hover 弹
 * tooltip 提示目标页名称；递归实例渲染在 hover 弹层内（展开态、文字完整
 * 可见），不需要 tooltip
 */
const showCollapsedTooltip = computed(() => isCollapsed.value && !props.isNested)

/** 激活菜单项：meta.activeMenu 优先（隐藏详情页高亮其列表页场景） */
const activeMenu = computed(() => {
  const meta = route.meta as { activeMenu?: string }
  return meta.activeMenu || route.path
})

/** 折叠弹层类名（element-plus teleports 到 body，需 BEM 前缀动态拼接） */
const popperClass = computed(() => `${bem.b()}-popper--${props.mode}`)

/** 节点应渲染为"单子项提升"的菜单项（而非父菜单分组） */
function isPromotedItem(node: MenuNode): boolean {
  if (!node.children?.length) return true
  if (node.alwaysShow) return false
  return resolveSingleChild(node).oneShowingChild
}

/** 提升项的渲染目标节点：单子项提升 → 子项；无可见子项 → 自身 */
function promotedNode(node: MenuNode): MenuNode {
  const { onlyChild } = resolveSingleChild(node)
  return onlyChild ?? node
}

function handleSelect(index: string): void {
  if (isUrl(index)) {
    window.open(index, '_blank', 'noopener,noreferrer')
  } else {
    router.push(index)
  }
}
</script>

<template>
  <!-- 根实例：包滚动容器（vertical）并绑定 select -->
  <nav v-if="!isNested" :class="[bem.b(), bem.m(mode), bem.is('collapsed', isCollapsed)]">
    <el-scrollbar v-if="mode === 'vertical'" :class="bem.e('scroll')">
      <el-menu
        :default-active="activeMenu"
        :mode="mode"
        :collapse="isCollapsed"
        :unique-opened="defaultLayoutConfig.ui.uniqueOpened"
        background-color="var(--left-menu-bg-color)"
        text-color="var(--left-menu-text-color)"
        active-text-color="var(--left-menu-text-active-color)"
        :popper-class="popperClass"
        @select="handleSelect"
      >
        <template v-for="node in menuNodes" :key="node.path">
          <!-- 单子项提升 / 叶子节点：直接菜单项 -->
          <el-menu-item v-if="isPromotedItem(node)" :index="promotedNode(node).path">
            <!-- 折叠态 tooltip：图标为唯一可见内容，hover 提示目标页名称（标题与
                 展开态文字同源，随 locale 切换自动更新）；此分支不渲染标题 span——
                 EP collapse 样式本就把直接子 span 隐藏（0×0 + visibility:hidden） -->
            <el-tooltip
              v-if="showCollapsedTooltip && promotedNode(node).icon"
              :content="promotedNode(node).title"
              placement="right"
              :show-after="300"
            >
              <MenuIcon :name="promotedNode(node).icon" />
            </el-tooltip>
            <template v-else>
              <MenuIcon v-if="promotedNode(node).icon" :name="promotedNode(node).icon" />
              <span :class="bem.e('title')">{{ promotedNode(node).title }}</span>
            </template>
          </el-menu-item>

          <!-- 父菜单分组 -->
          <!-- el-sub-menu :index 的 as any：EP 2.14 + TS6 已知 prop 类型 bug（同 PortalNav.vue），非业务逻辑 -->
          <el-sub-menu v-else :index="node.path as any" teleported :popper-class="popperClass">
            <template #title>
              <MenuIcon v-if="node.icon" :name="node.icon" />
              <span :class="bem.e('title')">{{ node.title }}</span>
            </template>
            <AppMenu :menu-nodes="node.children ?? []" :mode="mode" is-nested />
          </el-sub-menu>
        </template>
      </el-menu>
    </el-scrollbar>

    <el-menu
      v-else
      :default-active="activeMenu"
      mode="horizontal"
      background-color="var(--top-header-bg-color)"
      text-color="var(--top-header-text-color)"
      active-text-color="var(--el-color-primary)"
      :popper-class="popperClass"
      @select="handleSelect"
    >
      <template v-for="node in menuNodes" :key="node.path">
        <el-menu-item v-if="isPromotedItem(node)" :index="promotedNode(node).path">
          <MenuIcon v-if="promotedNode(node).icon" :name="promotedNode(node).icon" />
          <span :class="bem.e('title')">{{ promotedNode(node).title }}</span>
        </el-menu-item>
        <!-- as any 原因同上（EP 2.14 + TS6 prop 类型 bug） -->
        <el-sub-menu v-else :index="node.path as any" teleported :popper-class="popperClass">
          <template #title>
            <MenuIcon v-if="node.icon" :name="node.icon" />
            <span :class="bem.e('title')">{{ node.title }}</span>
          </template>
          <AppMenu :menu-nodes="node.children ?? []" :mode="mode" is-nested />
        </el-sub-menu>
      </template>
    </el-menu>
  </nav>

  <!-- 递归实例：只渲染节点列表，select 由根 el-menu 统一处理 -->
  <template v-else>
    <template v-for="node in menuNodes" :key="node.path">
      <el-menu-item v-if="isPromotedItem(node)" :index="promotedNode(node).path">
        <MenuIcon v-if="promotedNode(node).icon" :name="promotedNode(node).icon" />
        <span :class="bem.e('title')">{{ promotedNode(node).title }}</span>
      </el-menu-item>
      <!-- as any 原因同上（EP 2.14 + TS6 prop 类型 bug） -->
      <el-sub-menu v-else :index="node.path as any" teleported :popper-class="popperClass">
        <template #title>
          <MenuIcon v-if="node.icon" :name="node.icon" />
          <span :class="bem.e('title')">{{ node.title }}</span>
        </template>
        <AppMenu :menu-nodes="node.children ?? []" :mode="mode" is-nested />
      </el-sub-menu>
    </template>
  </template>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-app-menu {
  height: 100%;
  overflow: hidden;
  background: var(--left-menu-bg-color);
  flex: none;
  transition: width var(--transition-time-02);

  &__scroll {
    height: 100%;
  }

  // 展开/折叠宽度
  &--vertical:not(.is-collapsed) {
    width: var(--left-menu-max-width);
  }
  &--vertical.is-collapsed {
    width: var(--left-menu-min-width);
  }
  &--horizontal {
    flex: 1;
    min-width: 0;
    background: transparent;
  }

  // 非 scoped 样式下 :deep() 不会被编译、整条规则被浏览器丢弃——直接写后代选择器
  .el-menu {
    width: 100%;
    padding: 8px 0;
    border: none;

    .el-sub-menu__title,
    .el-menu-item {
      width: calc(100% - 20px);
      height: 44px;
      margin: 3px 10px;
      line-height: 44px;
      border-radius: 10px;
      transition:
        color 160ms ease,
        background-color 160ms ease;
    }

    // 激活态：文字高亮 + 主题色背景
    .el-menu-item.is-active {
      font-weight: 600;
      color: var(--left-menu-text-active-color) !important;
      background-color: var(--left-menu-bg-active-color) !important;
    }

    // 子菜单父标题激活时同步高亮文字
    .is-active > .el-sub-menu__title {
      color: var(--left-menu-text-active-color) !important;
    }

    // 箭头图标固定 1em 宽，避免不同图标字体下错位（对齐参考仓）
    .el-sub-menu__icon-arrow {
      width: 1em;
    }

    .el-sub-menu__title,
    .el-menu-item {
      &:hover {
        color: var(--left-menu-text-active-color) !important;
        background-color: var(--left-menu-bg-active-color) !important;
      }
    }

    // 内嵌子菜单（未 teleported 的二级及以下）：纵向间隙布局 + 浅底区分层级
    .el-menu--inline {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px 0 0;
      background-color: var(--left-menu-bg-light-color) !important;

      > .el-sub-menu {
        display: flex;
        flex-direction: column;
      }

      .el-menu-item {
        margin-top: 0;
        margin-bottom: 0;
      }
    }
  }

  // 折叠态：图标居中
  .el-menu--collapse {
    width: var(--left-menu-min-width);

    > .el-menu-item,
    > .el-sub-menu > .el-sub-menu__title {
      justify-content: center;
      width: 48px;
      padding: 0 !important;
      margin-right: 12px;
      margin-left: 12px;
    }

    // 折叠态图标固定 22px（对齐参考仓 .v-icon 22px）
    .el-icon {
      flex: none;
      width: 22px;
      height: 22px;
    }
  }

  // vertical 模式：图标与标题间距 10px（horizontal 模式由 EP 默认处理）
  &--vertical {
    .el-menu > .el-sub-menu > .el-sub-menu__title {
      margin-top: 0;
      margin-bottom: 0;
    }

    .el-menu--vertical > .el-sub-menu {
      margin: 3px 0;
    }

    .el-sub-menu__title,
    .el-menu-item {
      gap: 10px;
    }

    .el-menu--collapse {
      > .el-menu-item,
      > .el-sub-menu > .el-sub-menu__title {
        gap: 0;
      }
    }
  }

  // 水平模式（top 布局顶栏）
  &--horizontal {
    .el-menu--horizontal {
      display: flex;
      gap: 4px;
      align-items: center;
      height: var(--top-tool-height);
      padding: 0 12px;
      background: transparent;

      > .el-menu-item,
      > .el-sub-menu .el-sub-menu__title {
        width: auto;
        height: 38px;
        padding: 0 15px;
        margin: 0;
        line-height: 38px;
        color: var(--top-header-text-color) !important;
        border: 0;
        border-radius: 10px;

        &:hover {
          color: var(--el-color-primary) !important;
          background: var(--top-header-hover-color) !important;
        }
      }

      > .el-menu-item.is-active,
      > .el-sub-menu.is-active .el-sub-menu__title {
        font-weight: 600;
        color: var(--el-color-primary) !important;
        background: var(--el-color-primary-light-9) !important;
      }
    }
  }

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// ─── 折叠弹层（element-plus teleports 到 body，全局样式）────────────
// 类名由 `${bem.b()}-popper--${mode}` 动态拼接（见组件 popperClass 计算属性）
.#{$BEM_PREFIX}-app-menu-popper--vertical {
  // 子项极多时（demo 模块 60+ 页）弹层会超出视口——限高 + 内部滚动
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  border: 1px solid var(--layout-border-color) !important;
  border-radius: 12px !important;
  box-shadow: var(--layout-shadow) !important;

  .el-menu {
    padding: 6px;
    background-color: var(--left-menu-bg-color) !important;
  }

  .el-sub-menu__title,
  .el-menu-item {
    height: 40px;
    margin: 2px 0;
    line-height: 40px;
    color: var(--left-menu-text-color) !important;
    border-radius: 8px;

    &:hover {
      color: var(--left-menu-text-active-color) !important;
      background-color: var(--left-menu-bg-active-color) !important;
    }
  }

  .el-menu-item.is-active {
    color: var(--left-menu-text-active-color) !important;
    background-color: var(--left-menu-bg-active-color) !important;
  }
}

.#{$BEM_PREFIX}-app-menu-popper--horizontal {
  // teleport 到 body 取不到容器作用域的紫色主色（见 default-tokens.scss 作用域分层说明），
  // 因该类名为 default 布局专属，在此局部定义 EP 主色变量
  --el-color-primary: #5b5bd6;
  --el-color-primary-light-9: #eeeeff;

  overflow: hidden;
  border: 1px solid var(--layout-border-color) !important;
  border-radius: 12px !important;
  box-shadow: var(--layout-shadow) !important;

  .el-menu {
    min-width: 180px;
    padding: 6px;
    background-color: var(--top-header-bg-color) !important;
  }

  .el-sub-menu__title,
  .el-menu-item {
    height: 40px;
    margin: 2px 0;
    line-height: 40px;
    color: var(--top-header-text-color) !important;
    border-radius: 8px;

    &:hover {
      color: var(--el-color-primary) !important;
      background-color: var(--top-header-hover-color) !important;
    }
  }

  .el-menu-item.is-active {
    font-weight: 600;
    color: var(--el-color-primary) !important;
    background-color: var(--el-color-primary-light-9) !important;
  }
}

// 暗色：水平弹层局部 EP 变量（与 theme store 的 data-theme 机制对齐）
[data-theme='dark'] .#{$BEM_PREFIX}-app-menu-popper--horizontal {
  --el-color-primary: #818cf8;
  --el-color-primary-light-9: #252c49;
}

// 跟随系统：仅当用户未显式设置 data-theme
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .#{$BEM_PREFIX}-app-menu-popper--horizontal {
    --el-color-primary: #818cf8;
    --el-color-primary-light-9: #252c49;
  }
}
</style>
