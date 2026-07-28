<script setup lang="ts">
// PortalNav：基于 el-menu 的门户顶部导航
// - 父项无 children → 直接菜单项（点击 router.push 或外链）
// - 父项有 children → 子菜单父项（hover 弹出子菜单，父项本身不响应点击）
// - 子菜单项点击 → router.push 或外链
// - activeIndex 计算：当前路由 path 命中某顶层或某子项 → 把对应顶层 key 标为高亮
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PortalNavItem, PortalNavSubItem } from '@/layouts/portal/config/types'

const bem = createNamespace('portal-nav')

const props = defineProps<{
  items: PortalNavItem[]
}>()

const route = useRoute()
const router = useRouter()

/** 当前路由对应的顶层 nav key（用于 default-active 高亮父项） */
const activeIndex = computed<string>(() => {
  const path = route.path
  for (const item of props.items) {
    if (item.children?.length) {
      const match = item.children.find((c) => c.path === path)
      if (match) return item.key
    } else if (item.path && item.path === path) {
      return item.key
    }
  }
  return ''
})

function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function findSubItem(index: string): PortalNavSubItem | undefined {
  const [parentKey, childKey] = index.split(':')
  if (!parentKey || !childKey) return undefined
  const parent = props.items.find((i) => i.key === parentKey)
  return parent?.children?.find((c) => c.key === childKey)
}

function handleSelect(index: string): void {
  // 子项：parent:child 格式
  if (index.includes(':')) {
    const child = findSubItem(index)
    if (!child) return
    if (child.external) {
      openExternal(typeof child.external === 'string' ? child.external : child.path)
    } else {
      router.push(child.path)
    }
    return
  }

  // 顶层：仅在无 children 时才响应点击（子菜单父项忽略）
  const item = props.items.find((i) => i.key === index)
  if (!item || item.children?.length) return
  if (item.external) {
    openExternal(typeof item.external === 'string' ? item.external : (item.path ?? ''))
    return
  }
  if (item.path) router.push(item.path)
}
</script>

<template>
  <el-menu
    :class="bem.b()"
    mode="horizontal"
    :default-active="activeIndex"
    :ellipsis="false"
    menu-trigger="hover"
    @select="handleSelect"
  >
    <template v-for="item in items" :key="item.key">
      <el-sub-menu v-if="item.children?.length" :index="item.key as any">
        <template #title>
          <span :class="bem.e('label')">{{ item.label }}</span>
        </template>
        <el-menu-item
          v-for="child in item.children"
          :key="child.key"
          :index="`${item.key}:${child.key}`"
        >
          {{ child.label }}
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item v-else :index="item.key">
        <span :class="bem.e('label')">{{ item.label }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<style lang="scss" scoped>
.#{$BEM_PREFIX}-portal-nav {
  // 顶部导航透明背景（叠在 header 蓝渐变上）
  background: transparent;
  border-bottom: none;
  --el-menu-bg-color: transparent;
  --el-menu-border-color: transparent;
  --el-menu-text-color: rgba(255, 255, 255, 0.8);
  --el-menu-hover-color: #fff;
  --el-menu-active-color: #fff;

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 52px;
    line-height: 52px;
    padding: 0 !important;
    margin-right: 80px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 20px;
    font-family: 'PingFang SC', 'Alibaba PuHuiTi', sans-serif;
    background: transparent !important;

    &:hover {
      color: #fff;
      background: transparent !important;
    }
  }

  :deep(.el-menu-item:last-child),
  :deep(.el-sub-menu:last-child > .el-sub-menu__title) {
    margin-right: 0;
  }

  // 激活态：白色下划线 + 中间对齐
  :deep(.el-menu-item.is-active) {
    color: #fff;
    font-weight: 500;
    border-bottom: 4px solid #fff;
    border-radius: 0;
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: #fff;
    border-bottom: 4px solid #fff;
    border-radius: 0;
  }

  // 弹层子菜单样式
  :deep(.el-menu--horizontal .el-menu .el-menu-item) {
    height: 40px;
    line-height: 40px;
    margin-right: 0;
    padding: 0 16px !important;
    font-size: 14px;
    color: #303133;
    background: #fff !important;

    &:hover {
      background: #ecf5ff !important;
      color: var(--el-color-primary) !important;
    }
  }

  // 折叠箭头隐藏
  :deep(.el-sub-menu__icon-arrow) {
    display: none;
  }

  &__label {
    display: inline-block;
  }
}
</style>
