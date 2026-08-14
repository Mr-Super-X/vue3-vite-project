<script setup lang="ts">
// 数据总览：标题 + 周期切换 + 2+3 卡片网格
// 规格：标题 24px 高 + 周期 28px 高 / 第一行 2 卡 688x170 / 第二行 3 卡 450x170
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import OverviewCard from './OverviewCard.vue'
import OverviewCardSkeleton from './OverviewCardSkeleton.vue'
import OverviewErrorState from './OverviewErrorState.vue'
import OverviewEmptyState from './OverviewEmptyState.vue'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'
// 卡片图标必须静态 import（走 vite 资源管线生成带 hash 的 URL）。
// 动态 src 字符串（如 '../../images/x.png'）浏览器按页面 URL 解析，子路径部署下必 404
import iconLaw from '@/modules/home/images/data-overview-01.png'
import iconMonitor from '@/modules/home/images/data-overview-02.png'
import iconSafety from '@/modules/home/images/data-overview-03.png'
import iconTraining from '@/modules/home/images/data-overview-04.png'
import iconHazard from '@/modules/home/images/data-overview-05.png'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-section')

// card.code → 图标资源（data-overview-01..05.png，存于 modules/home/images）
const CARD_ICONS: Record<string, string> = {
  law: iconLaw,
  monitor: iconMonitor,
  safety: iconSafety,
  training: iconTraining,
  hazard: iconHazard,
}

interface OverviewCardView extends OverviewCardDto {
  iconPath: string
}

const store = usePortalOverviewStore()
const { cards, loading, error } = storeToRefs(store)

const period = ref<'custom' | 'month' | 'quarter' | 'year'>('month')
const periods = [
  { key: 'custom', label: '自定义' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' },
  { key: 'year', label: '本年' },
] as const

// 将 5 张卡片拆分到两行：第一行 2 张（更大），第二行 3 张（更小）
const row1 = computed<OverviewCardView[]>(() =>
  cards.value.slice(0, 2).map((c) => ({ ...c, iconPath: CARD_ICONS[c.code] ?? iconLaw }))
)
const row2 = computed<OverviewCardView[]>(() =>
  cards.value.slice(2, 5).map((c) => ({ ...c, iconPath: CARD_ICONS[c.code] ?? iconLaw }))
)
</script>

<template>
  <section :class="bem.b()" aria-labelledby="overview-title">
    <header :class="bem.e('header')">
      <h2 id="overview-title" :class="bem.e('heading')">
        <img
          :class="bem.e('icon')"
          src="@/modules/home/images/data-overview-01.png"
          alt=""
          width="24"
          height="24"
        />
        数据总览
      </h2>
      <div :class="bem.e('period')">
        <button
          type="button"
          :class="[bem.e('custom'), bem.is('active', period === 'custom')]"
          @click="period = 'custom'"
        >
          自定义
          <span :class="bem.e('custom-icon')" aria-hidden="true">📅</span>
        </button>
        <div :class="bem.e('segment')" role="tablist">
          <button
            v-for="p in periods.slice(1)"
            :key="p.key"
            type="button"
            role="tab"
            :class="[bem.e('chip'), bem.is('active', period === p.key)]"
            @click="period = p.key"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="loading" :class="bem.e('rows')">
      <div :class="[bem.e('row'), bem.em('row', 'first')]">
        <OverviewCardSkeleton v-for="i in 2" :key="`r1s-${i}`" />
      </div>
      <div :class="[bem.e('row'), bem.em('row', 'second')]">
        <OverviewCardSkeleton v-for="i in 3" :key="`r2s-${i}`" />
      </div>
    </div>

    <OverviewErrorState v-else-if="error" :message="error!.message" @retry="store.fetch()" />

    <OverviewEmptyState v-else-if="cards.length === 0" />

    <div v-else :class="bem.e('rows')">
      <div :class="[bem.e('row'), bem.em('row', 'first')]">
        <OverviewCard
          v-for="card in row1"
          :key="card.code"
          :title="card.title"
          :icon-path="card.iconPath"
          :icon-bg="card.iconBg"
          :metrics="card.metrics"
          :view-detail-path="card.viewDetailPath"
        />
      </div>
      <div :class="[bem.e('row'), bem.em('row', 'second')]">
        <OverviewCard
          v-for="card in row2"
          :key="card.code"
          :title="card.title"
          :icon-path="card.iconPath"
          :icon-bg="card.iconBg"
          :metrics="card.metrics"
          :view-detail-path="card.viewDetailPath"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-section {
  max-width: var(--portal-max-width);
  margin: 0 auto;
  padding: 44px 0 24px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  &__heading {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: 500;
    color: #000;
    line-height: 34px;
  }

  &__icon {
    width: 24px;
    height: 24px;
  }

  &__period {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__custom {
    width: 140px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #fff;
    border: 1px solid #e6e6e6;
    border-radius: 4px;
    color: #8c8c8c;
    font-size: 14px;
    cursor: pointer;
  }

  &__custom-icon {
    font-size: 12px;
  }

  &__segment {
    display: inline-flex;
    align-items: center;
    border: 1px solid #e6e6e6;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
  }

  &__chip {
    width: 44px;
    height: 28px;
    background: #fff;
    color: #8c8c8c;
    border: none;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    line-height: 24px;

    &.is-active {
      background: rgba(22, 119, 255, 0.1);
      color: #1677ff;
      font-weight: 500;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__row {
    display: grid;
    gap: 24px;

    &--first {
      grid-template-columns: repeat(2, 1fr);
    }

    &--second {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}
</style>
