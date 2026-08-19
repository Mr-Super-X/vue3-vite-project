<script setup lang="ts">
// 数据总览卡片（2+3 布局共用）
// 规格：左 130px 色块区 + 右 metrics 列表（每行 42px 高）
// iconPath 由父组件按 card.code 拼好真实 URL 传入，避免模板里动态拼接 webpack 别名
import OverviewMetricRow from './OverviewMetricRow.vue'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'
import { useAppRouter } from '@composables/useAppRouter'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-card')

const props = defineProps<{
  title: string
  iconPath: string
  iconBg: string
  metrics: OverviewCardDto['metrics']
  // 允许显式 undefined 透传，避开 exactOptionalPropertyTypes 严格模式
  viewDetailPath?: string | undefined
}>()

const { router } = useAppRouter()
const iconSrc = computed(() => new URL(props.iconPath, import.meta.url).href)

function onView(): void {
  if (props.viewDetailPath) router.push(props.viewDetailPath)
}
</script>

<template>
  <article :class="bem.b()" data-test="card">
    <div :class="bem.e('art')" :style="{ background: iconBg }">
      <img :class="bem.e('icon')" :src="iconSrc" :alt="title" width="48" height="48" />
      <h3 :class="bem.e('title')">{{ title }}</h3>
      <button v-if="viewDetailPath" type="button" :class="bem.e('view')" @click="onView">
        <span :class="bem.e('view-arrow')" aria-hidden="true">▶</span>
      </button>
    </div>
    <div :class="bem.e('body')">
      <OverviewMetricRow v-for="(m, idx) in metrics" :key="idx" :metric="m" />
    </div>
  </article>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-card {
  background: #fff;
  border-radius: 4px;
  box-shadow: 4px 4px 16px 0 rgba(0, 0, 0, 0.05);
  padding: 6px;
  display: flex;
  gap: 0;
  height: 170px;

  &__art {
    flex: 0 0 130px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0 14px;
    border-radius: 4px;
    position: relative;
  }

  &__icon {
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    color: #000;
    line-height: 28px;
  }

  &__view {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0;
  }

  &__view-arrow {
    display: inline-block;
    font-size: 10px;
    color: #000;
    transform: rotate(-90deg);
  }

  &__body {
    flex: 1;
    padding: 8px 16px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
}
</style>
