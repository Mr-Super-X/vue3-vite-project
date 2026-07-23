<script setup lang="ts">
/**
 * 演示页统一容器（对标 datact-web demo/components/frame.vue 的简化版）
 *
 * 用途：每个组件示例页都用它包裹，提供标题、简介、主内容三段式结构。
 * 不提供"在编辑器打开组件"按钮（项目未配置 vite-plugin-vue-inspector）。
 */
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps<{
  /** 组件名（顶部大标题） */
  title: string
  /** 组件源文件路径（仅展示用，不做跳转） */
  source?: string
  /** 简介要点列表（字符串或 VNode 数组均可） */
  introductions?: string[]
}>()

const router = useRouter()

/**
 * 返回 demo 首页。
 * 用 push 而非 back()，避免历史栈缺失时（如从外部链接直接进入）落到意料外的页面。
 */
function goBack() {
  router.push('/demo')
}
</script>

<template>
  <section class="demo-frame">
    <header class="demo-frame__header">
      <el-button link :icon="ArrowLeft" class="demo-frame__back" @click="goBack">返回</el-button>
      <h1 class="demo-frame__title">{{ title }}</h1>
      <code v-if="source" class="demo-frame__source">{{ source }}</code>
    </header>

    <ul v-if="introductions?.length" class="demo-frame__intro">
      <li v-for="(line, i) in introductions" :key="i">{{ line }}</li>
    </ul>

    <div class="demo-frame__body">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.demo-frame {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  &__source {
    font-size: 12px;
    color: #999;
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
  }

  &__intro {
    margin: 0;
    padding: 12px 16px 12px 28px;
    background: #fafafa;
    border-radius: 6px;
    list-style-position: inside;
    color: #666;
    font-size: 13px;
    line-height: 1.8;

    li {
      list-style-type: disc;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
