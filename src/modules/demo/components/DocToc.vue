<script setup lang="ts">
/**
 * 右侧楼层导航（基础版：纯锚点跳转）
 *
 * 接收 items 数组 [{ id, label }]，渲染为链接列表。
 * 不监听滚动、不高亮当前区域——基础版够用，进阶版用 IntersectionObserver。
 *
 * scroll-margin-top 在 ApiTable 区块设置（80px），与布局顶部预留匹配。
 */
defineProps<{
  items: { id: string; label: string }[]
  title?: string
}>()
</script>

<template>
  <nav class="doc-toc" v-if="items.length">
    <h3 class="doc-toc__title">{{ title ?? '本页导航' }}</h3>
    <ul class="doc-toc__list">
      <li v-for="item in items" :key="item.id">
        <a :href="`#${item.id}`" class="doc-toc__link">{{ item.label }}</a>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
.doc-toc {
  font-size: 12px;

  &__title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-left: 1px solid var(--el-border-color-lighter, #ebeef5);
  }

  &__link {
    display: block;
    padding: 4px 12px;
    margin-left: -1px;
    border-left: 1px solid transparent;
    color: #606266;
    text-decoration: none;
    line-height: 1.6;
    transition:
      color 0.15s,
      border-color 0.15s;

    &:hover {
      color: #409eff;
      border-left-color: #409eff;
    }
  }
}
</style>
