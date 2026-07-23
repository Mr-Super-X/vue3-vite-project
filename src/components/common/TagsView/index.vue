<script setup lang="ts">
// 多页签 UI 组件
//
// 设计要点：
//   - 横排可滚动（横向 overflow-x），支持任意数量 tab
//   - 单击切换（不跳自己）
//   - 中键 / 右键菜单关闭（菜单含"关闭其他 / 关闭全部"）
//   - affix=true 的 tag 不显示关闭按钮且不可关（如 Home）
//   - 关闭 active tag 后自动跳到最后一个 visited

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsViewStore, type TagView } from '@/store/modules/tags-view'
import { createNamespace } from '@utils/bem'

const route = useRoute()
const router = useRouter()
const store = useTagsViewStore()
// 运行时 BEM 命名空间：gm-tags-view / __item / __title / __close / __menu
const bem = createNamespace('tags-view')

const contextMenu = ref<{ x: number; y: number; tag: TagView } | null>(null)

const visitedViews = computed(() => store.visitedViews)
const activeName = computed(() => (route.name ? String(route.name) : ''))

function navigateTo(tag: TagView): void {
  if (tag.name === activeName.value) return // 已激活不跳
  router.push(tag.path).catch(() => {
    /* 跳当前路由时抛 NavigationFailed，忽略 */
  })
}

function closeTab(tag: TagView, ev?: Event): void {
  ev?.stopPropagation()
  const wasActive = tag.name === activeName.value
  store.removeView(tag)
  // 关的是 active：跳到最后一个 visited
  if (wasActive) {
    const last = visitedViews.value[visitedViews.value.length - 1]
    if (last && last.name !== activeName.value) {
      router.push(last.path).catch(() => {})
    }
  }
}

function onContextMenu(tag: TagView, e: MouseEvent): void {
  e.preventDefault()
  contextMenu.value = { x: e.clientX, y: e.clientY, tag }
  document.addEventListener('click', closeMenu, { once: true })
}

function closeMenu(): void {
  contextMenu.value = null
}

function menuAction(action: 'close-others' | 'close-all'): void {
  const tag = contextMenu.value?.tag
  if (!tag) return
  if (action === 'close-others') {
    store.closeOthers(tag)
    if (tag.name !== activeName.value) router.push(tag.path).catch(() => {})
  } else {
    store.closeAll()
    const first = visitedViews.value[0]
    if (first) router.push(first.path).catch(() => {})
  }
  closeMenu()
}
</script>

<template>
  <div :class="bem.b()">
    <div :class="bem.e('scroll')">
      <div
        v-for="tag in visitedViews"
        :key="tag.name"
        :class="[
          bem.e('item'),
          bem.is('active', tag.name === activeName),
          bem.is('affix', tag.affix),
        ]"
        @click="navigateTo(tag)"
        @contextmenu.prevent="onContextMenu(tag, $event)"
      >
        <span :class="bem.e('title')">{{ tag.title }}</span>
        <button
          v-if="!tag.affix"
          :class="bem.e('close')"
          aria-label="关闭"
          @click.stop="closeTab(tag, $event)"
        >
          ×
        </button>
      </div>
    </div>

    <ul
      v-if="contextMenu"
      :class="bem.e('menu')"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <li @click="menuAction('close-others')">关闭其他</li>
      <li @click="menuAction('close-all')">关闭全部</li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins/bem' as *;

@include b(gm-tags-view) {
  display: flex;
  align-items: center;
  height: var(--tags-view-height, 36px);
  padding: 0 var(--spacing-md);
  background: var(--bg-secondary, #fafafa);
  border-bottom: 1px solid var(--border-color, #eee);
  user-select: none;

  &__scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    flex: 1;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #fff;
    border: 1px solid var(--border-color, #e4e7ed);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-regular, #606266);
    white-space: nowrap;
    transition: border-color 150ms;

    &:hover {
      border-color: var(--el-color-primary, #409eff);
    }

    &.is-active {
      background: var(--el-color-primary, #409eff);
      color: #fff;
      border-color: var(--el-color-primary, #409eff);
    }

    &.is-affix .gm-tags-view__close {
      display: none;
    }
  }

  &__title {
    line-height: 1;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0 2px;
    font-size: 14px;
    line-height: 1;
    color: inherit;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }

  &__menu {
    position: fixed;
    z-index: 9999;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    background: #fff;
    border: 1px solid var(--border-color, #e4e7ed);
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    li {
      padding: 6px 16px;
      cursor: pointer;
      font-size: 13px;
      &:hover {
        background: var(--bg-secondary, #f5f7fa);
      }
    }
  }
}
</style>
