<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import OverviewCard from './OverviewCard.vue'
import OverviewCardSkeleton from './OverviewCardSkeleton.vue'
import OverviewErrorState from './OverviewErrorState.vue'
import OverviewEmptyState from './OverviewEmptyState.vue'

const store = usePortalOverviewStore()
const { cards, loading, error } = storeToRefs(store)
</script>

<template>
  <section class="overview" aria-labelledby="overview-title">
    <header class="overview__header">
      <h2 id="overview-title" class="overview__heading">
        <span class="overview__dot" aria-hidden="true" />
        数据总览
      </h2>
      <div class="overview__period">
        <button type="button" class="overview__chip">自定义</button>
        <button type="button" class="overview__chip active">本月</button>
        <button type="button" class="overview__chip">本季</button>
        <button type="button" class="overview__chip">本年</button>
      </div>
    </header>

    <div v-if="loading" class="overview__grid">
      <OverviewCardSkeleton v-for="i in 5" :key="i" />
    </div>

    <OverviewErrorState v-else-if="error" :message="error!.message" @retry="store.fetch()" />

    <OverviewEmptyState v-else-if="cards.length === 0" />

    <div v-else class="overview__grid">
      <OverviewCard
        v-for="card in cards"
        :key="card.code"
        :title="card.title"
        :icon-name="card.iconName"
        :icon-bg="card.iconBg"
        :metrics="card.metrics"
        :view-detail-path="card.viewDetailPath"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.overview {
  margin: 24px 0;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  &__heading {
    margin: 0;
    font-size: 20px;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--el-color-primary);
  }

  &__period {
    display: flex;
    gap: 8px;
  }

  &__chip {
    padding: 4px 12px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 13px;
    color: #606266;
    cursor: pointer;

    &.active {
      background: #ecf5ff;
      border-color: #409eff;
      color: #409eff;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
}
</style>
