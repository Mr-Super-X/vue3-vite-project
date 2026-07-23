<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import * as ElIcons from '@element-plus/icons-vue'
import type { Component } from 'vue'
import OverviewMetricRow from './OverviewMetricRow.vue'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'

const props = defineProps<{
  title: string
  iconName: string
  iconBg: string
  metrics: OverviewCardDto['metrics']
  // 允许显式 undefined 透传，避开 exactOptionalPropertyTypes 严格模式
  viewDetailPath?: string | undefined
}>()

const router = useRouter()

// iconName 取自静态 config；找不到时返回 null 让 <component> 不渲染
const iconComponent = computed<Component | null>(() => {
  const found = (ElIcons as Record<string, unknown>)[props.iconName]
  return (found as Component | undefined) ?? null
})

function onView(): void {
  if (props.viewDetailPath) router.push(props.viewDetailPath)
}
</script>

<template>
  <article class="ov-card" data-test="card">
    <header class="ov-card__head">
      <div class="ov-card__icon" :style="{ background: iconBg }">
        <el-icon :size="24" color="#fff">
          <component :is="iconComponent" v-if="iconComponent" />
        </el-icon>
      </div>
      <h3 class="ov-card__title">{{ title }}</h3>
    </header>
    <div class="ov-card__body">
      <OverviewMetricRow v-for="(m, idx) in metrics" :key="idx" :metric="m" />
    </div>
    <footer class="ov-card__foot">
      <button v-if="viewDetailPath" type="button" class="ov-card__view" @click="onView">
        {{ title }} ▶
      </button>
    </footer>
  </article>
</template>

<style lang="scss" scoped>
.ov-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 16px;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: grid;
    place-items: center;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    color: #303133;
  }

  &__body {
    flex: 1;
  }

  &__foot {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #ebeef5;
  }

  &__view {
    background: none;
    border: none;
    color: #409eff;
    cursor: pointer;
    font-size: 13px;
  }
}
</style>
