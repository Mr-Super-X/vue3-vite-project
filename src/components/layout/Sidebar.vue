<script setup lang="ts">
// 侧边栏菜单组件
//
// 设计要点：
//   - 从 router.getRoutes() 自动派生菜单（无需手动维护菜单列表）
//   - 多级菜单递归渲染
//   - 过滤：meta.visible === false 隐藏；path === '/' 跳过；children 为空跳过
//   - 当前激活：path 匹配高亮（支持 prefix 匹配，子页 /orders/list 也高亮 /orders 父菜单）
//   - 折叠态：appStore.sidebarCollapsed 联动（仅显示图标）
//   - i18n 标题：resolveRouteTitle(route, t) → titleKey → title → name fallback
//   - 图标：meta.icon（Element Plus icon 名）→ <component :is="...">
//
// 设计取舍（2026-07-24 实施）：
//   原计划用 el-menu / el-sub-menu / el-menu-item 实现，但 Element Plus 2.14 在
//   Vue 3.5 + TS 6 下存在已知类型 bug（prop 类型被推断为 PropType 元对象）。
//   重写为纯 Vue + router-link 实现：完全类型安全，零 @ts-ignore，
//   折叠过渡用 CSS transition 实现。
//
// 已知缺口：
//   - icon 按需引入 Element Plus icons（当前 * 通配，未来可改 unplugin-icons 按需加载）
//   - 远程菜单注入的路由会通过 router.getRoutes() 自动出现，无需特殊处理

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import * as ElIcons from '@element-plus/icons-vue'
import { useAppStore } from '@/store/modules/app'
import { useAppRouter } from '@composables/useAppRouter'
import { resolveRouteTitle, extractRouteIcon } from '@/router/helpers'

interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
}

const appStore = useAppStore()
const { router } = useAppRouter()
const route = useRoute()
const { t } = useI18n()

/** 当前展开的子菜单路径集合（折叠态全部收起）。 */
const openMenus = ref<Set<string>>(new Set())

/**
 * 把路由记录转为 MenuItem。
 *
 * 过滤规则：
 *   1. 没有 path 的路由（layout 包裹层）→ 跳过
 *   2. meta.visible === false → 跳过
 *   3. children 全空 → 跳过
 *   4. 没有 name 也没可渲染 children 的孤儿路由 → 跳过
 */
function toMenuItem(r: ReturnType<typeof router.getRoutes>[number]): MenuItem | null {
  const visible = (r.meta as { visible?: boolean } | undefined)?.visible
  if (visible === false) return null

  const rawChildren = (r.children ?? []) as unknown as Array<
    ReturnType<typeof router.getRoutes>[number]
  >
  const children = rawChildren.map(toMenuItem).filter((c): c is MenuItem => c !== null)

  const title = resolveRouteTitle(
    {
      meta: r.meta as Record<string, unknown>,
      name: typeof r.name === 'string' ? r.name : undefined,
    },
    t
  )

  if (!r.path) return null
  if (r.path === '/') return null
  if (!r.name && children.length === 0) return null

  const item: MenuItem = {
    path: r.path.startsWith('/') ? r.path : `/${r.path}`,
    title,
  }
  const icon = extractRouteIcon({ meta: r.meta as Record<string, unknown> })
  if (icon) item.icon = icon
  if (children.length > 0) item.children = children
  return item
}

/**
 * 从所有路由派生菜单树。
 *
 * 排除：错误页 / 登录页 / catch-all fallback。
 */
const menuItems = computed<MenuItem[]>(() => {
  return router
    .getRoutes()
    .filter((r) => {
      if (!r.path) return false
      if (r.path === '/') return false
      const name = typeof r.name === 'string' ? r.name : ''
      if (['Login', 'Forbidden', 'NotFound', 'ServerError'].includes(name)) return false
      if (r.path.includes(':pathMatch')) return false
      return true
    })
    .map(toMenuItem)
    .filter((m): m is MenuItem => m !== null)
})

/** Element Plus icon 解析：字符串 → 组件。 */
function resolveIcon(name?: string) {
  if (!name) return undefined
  return (ElIcons as Record<string, unknown>)[name]
}

/**
 * 判断菜单项是否处于"激活或子项激活"状态。
 * 父菜单：当前路由 path 以菜单项 path 开头（prefix 匹配）。
 */
function isActive(itemPath: string): boolean {
  const current = route.path
  if (current === itemPath) return true
  // prefix 匹配：/orders 高亮 /orders/list 的父菜单
  if (itemPath !== '/' && current.startsWith(itemPath + '/')) return true
  return false
}

/** 切换子菜单展开状态。 */
function toggleMenu(itemPath: string): void {
  if (openMenus.value.has(itemPath)) {
    openMenus.value.delete(itemPath)
  } else {
    openMenus.value.add(itemPath)
  }
}

/** 折叠态下父菜单点击 = 直接跳第一个子菜单（或自身）。 */
function handleParentClick(item: MenuItem): void {
  if (appStore.sidebarCollapsed) {
    const target = item.children?.[0]?.path ?? item.path
    router.push(target)
  } else {
    toggleMenu(item.path)
  }
}
</script>

<template>
  <aside class="vv-sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="vv-sidebar__brand">
      <h1 v-if="!appStore.sidebarCollapsed">工贸统一登录</h1>
    </div>

    <nav class="vv-sidebar__nav">
      <template v-for="item in menuItems" :key="item.path">
        <!-- 多级菜单 -->
        <div v-if="item.children && item.children.length > 0" class="vv-sidebar__group">
          <div
            class="vv-sidebar__parent"
            :class="{ active: isActive(item.path) }"
            @click="handleParentClick(item)"
          >
            <el-icon v-if="item.icon" class="vv-sidebar__icon">
              <component :is="resolveIcon(item.icon)" />
            </el-icon>
            <span v-if="!appStore.sidebarCollapsed" class="vv-sidebar__title">
              {{ item.title }}
            </span>
            <span v-if="!appStore.sidebarCollapsed" class="vv-sidebar__caret">
              {{ openMenus.has(item.path) ? '▾' : '▸' }}
            </span>
          </div>
          <ul
            v-show="openMenus.has(item.path) && !appStore.sidebarCollapsed"
            class="vv-sidebar__sublist"
          >
            <li v-for="child in item.children" :key="child.path">
              <router-link
                :to="child.path"
                class="vv-sidebar__link"
                :class="{ active: isActive(child.path) }"
              >
                <el-icon v-if="child.icon" class="vv-sidebar__icon">
                  <component :is="resolveIcon(child.icon)" />
                </el-icon>
                <span class="vv-sidebar__title">{{ child.title }}</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- 一级菜单 -->
        <div v-else class="vv-sidebar__group">
          <router-link
            :to="item.path"
            class="vv-sidebar__parent"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon v-if="item.icon" class="vv-sidebar__icon">
              <component :is="resolveIcon(item.icon)" />
            </el-icon>
            <span v-if="!appStore.sidebarCollapsed" class="vv-sidebar__title">
              {{ item.title }}
            </span>
          </router-link>
        </div>
      </template>
    </nav>

    <div class="vv-sidebar__footer">
      <button class="vv-sidebar__toggle" @click="appStore.toggleSidebar">
        {{ appStore.sidebarCollapsed ? '»' : '«' }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.vv-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width, 220px);
  height: 100%;
  background: #001529;
  color: #bfcbd9;
  transition: width 200ms ease;
}
.vv-sidebar.collapsed {
  width: var(--sidebar-collapsed-width, 64px);
}

.vv-sidebar__brand {
  padding: 16px;
  border-bottom: 1px solid #1f3a5a;
  color: #fff;
}
.vv-sidebar__brand h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.vv-sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.vv-sidebar__nav::-webkit-scrollbar {
  width: 4px;
}
.vv-sidebar__nav::-webkit-scrollbar-thumb {
  background: #1f3a5a;
}

.vv-sidebar__group {
  margin-bottom: 2px;
}

.vv-sidebar__parent {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  font-size: 14px;
  transition: background 150ms;
}
.vv-sidebar__parent:hover {
  background: #1f3a5a;
  color: #fff;
}
.vv-sidebar__parent.active {
  background: #1890ff;
  color: #fff;
}

.vv-sidebar__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.vv-sidebar__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vv-sidebar__caret {
  font-size: 10px;
  opacity: 0.7;
}

.vv-sidebar__sublist {
  list-style: none;
  margin: 0;
  padding: 0;
  background: #000c17;
}
.vv-sidebar__sublist li {
  margin: 0;
}

.vv-sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 44px;
  text-decoration: none;
  color: inherit;
  font-size: 13px;
  transition: background 150ms;
}
.vv-sidebar__link:hover {
  background: #1f3a5a;
  color: #fff;
}
.vv-sidebar__link.active {
  background: #1890ff;
  color: #fff;
}

.vv-sidebar__footer {
  padding: 12px;
  border-top: 1px solid #1f3a5a;
}
.vv-sidebar__toggle {
  width: 100%;
  padding: 6px;
  background: transparent;
  border: 1px solid #1f3a5a;
  color: #bfcbd9;
  cursor: pointer;
  border-radius: 4px;
}
.vv-sidebar__toggle:hover {
  background: #1f3a5a;
  color: #fff;
}
</style>
