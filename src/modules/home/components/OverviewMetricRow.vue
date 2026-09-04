<script setup lang="ts">
// 单条指标行：label | value | trend
// 规格：行高 42px / 标签 14px / 数值 20px bold / 趋势 12px + 8x8 方向箭头
import type { OverviewMetricDto } from '@/modules/home/types/portal-overview'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-metric-row')

defineProps<{
  metric: OverviewMetricDto
}>()
</script>

<template>
  <div :class="bem.b()">
    <div :class="bem.e('label')">
      <span :class="bem.e('label-text')">{{ metric.label }}</span>
      <span v-if="metric.unit" :class="bem.e('unit')">{{ metric.unit }}</span>
    </div>
    <div :class="bem.e('value-wrap')">
      <span :class="bem.e('value')">{{ metric.value }}</span>
      <span
        :class="[
          bem.e('trend'),
          bem.is('up', metric.trend === 'up'),
          bem.is('down', metric.trend === 'down'),
          bem.is('flat', metric.trend === 'flat'),
        ]"
      >
        <span :class="bem.e('arrow')" aria-hidden="true" />
        <span :class="bem.e('trend-text')">同比 {{ metric.trendText }}</span>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 42px;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 0 16px;
  font-family: 'PingFang SC', 'Alibaba PuHuiTi', sans-serif;

  &__label {
    display: flex;
    align-items: baseline;
    gap: 4px;
    color: #000;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    min-width: 0;
  }

  &__label-text {
    white-space: nowrap;
  }

  &__unit {
    color: #666;
    font-size: 12px;
    line-height: 12px;
    font-weight: 400;
  }

  &__value-wrap {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-shrink: 0;
  }

  &__value {
    font-size: 20px;
    font-weight: 700;
    color: #000;
    line-height: 30px;
    font-variant-numeric: tabular-nums;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    line-height: 18px;
    color: #8c8c8c;
    font-weight: 400;
    font-family: 'PingFang SC', sans-serif;

    &.is-up {
      color: #e5484d;
    }

    &.is-down {
      color: #30a46c;
    }

    &.is-flat {
      color: #8c8c8c;
    }
  }

  &__arrow {
    width: 8px;
    height: 8px;
    border: solid currentColor;
    border-width: 0 1.5px 1.5px 0;
    display: inline-block;
    transform: rotate(-45deg);
    margin-top: -2px;
  }

  &__trend.is-down &__arrow {
    transform: rotate(135deg);
    margin-top: 2px;
  }

  &__trend.is-flat &__arrow {
    width: 8px;
    height: 2px;
    border: none;
    background: currentColor;
    transform: none;
    margin-top: 0;
  }

  &__trend-text {
    font-weight: 700;
    color: inherit;
    font-family: 'DIN Alternate', 'Alibaba PuHuiTi', sans-serif;
  }
}
</style>
