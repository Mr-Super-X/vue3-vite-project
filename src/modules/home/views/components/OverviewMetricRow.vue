<script setup lang="ts">
import { computed } from 'vue'
import type { OverviewMetricDto } from '@/modules/home/types/portal-overview'

const props = defineProps<{
  metric: OverviewMetricDto
}>()

const trendClass = computed(() => `is-${props.metric.trend}`)
</script>

<template>
  <div class="ov-row">
    <div class="ov-row__label">
      {{ metric.label }}
      <span v-if="metric.unit" class="ov-row__unit">{{ metric.unit }}</span>
    </div>
    <div class="ov-row__value-wrap">
      <span class="ov-row__value">{{ metric.value }}</span>
      <span :class="['ov-row__trend', trendClass]">
        {{ metric.trendText }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ov-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  &__label {
    color: #606266;
    font-size: 13px;
  }

  &__unit {
    color: #909399;
    font-size: 12px;
    margin-left: 2px;
  }

  &__value-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

  &__trend {
    font-size: 12px;

    &.is-up {
      color: var(--trend-up);
    }

    &.is-down {
      color: var(--trend-down);
    }

    &.is-flat {
      color: var(--trend-flat);
    }
  }
}
</style>
