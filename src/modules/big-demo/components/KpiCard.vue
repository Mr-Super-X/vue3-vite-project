<script setup lang="ts">
/**
 * 大屏指标卡：标签 + 数值 + 单位 + 同比趋势（红涨绿跌，A 股惯例）。
 *
 * 纯展示组件，数据由父级面板传入；趋势行仅在传入 trend 时渲染。
 */
interface Props {
  /** 指标名（如「今日交易额」） */
  label: string
  /** 指标值（已格式化字符串或数字） */
  value: string | number
  /** 单位（如「万元」「单」）；显式允许 undefined——exactOptionalPropertyTypes 下 `?: string` 不接受显式 undefined 传入 */
  unit?: string | undefined
  /** 同比变化百分比（正=涨红，负=跌绿，0=持平灰；不传则不显示趋势行） */
  trend?: number | undefined
}
const props = defineProps<Props>()

const bem = createNamespace('kpi-card')

const trendText = computed(() => {
  if (props.trend === undefined) return ''
  const sign = props.trend > 0 ? '+' : ''
  return `${sign}${props.trend}%`
})
const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  // 三态：涨红 / 跌绿 / 持平中性灰（trend=0 渲染 ▲+0% 是语义错误——0 非上涨）
  if (props.trend > 0) return bem.em('trend', 'up')
  if (props.trend < 0) return bem.em('trend', 'down')
  return bem.em('trend', 'flat')
})
</script>

<template>
  <div :class="bem.b()">
    <div :class="bem.e('label')">{{ label }}</div>
    <div :class="bem.e('value-row')">
      <span :class="bem.e('value')">{{ value }}</span>
      <span v-if="unit" :class="bem.e('unit')">{{ unit }}</span>
    </div>
    <div v-if="trend !== undefined" :class="trendClass">
      {{ trend > 0 ? '▲' : trend < 0 ? '▼' : '—' }} {{ trendText }} 同比
    </div>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-kpi-card {
  box-sizing: border-box;
  padding: 16px 20px;
  background: rgba(13, 38, 76, 0.35);
  border: 1px solid rgba(62, 140, 255, 0.2);

  &__label {
    font-size: 16px;
    color: #8fa8d8;
  }

  &__value-row {
    display: flex;
    align-items: baseline;
    margin-top: 8px;
  }

  &__value {
    font-size: 36px;
    font-weight: 700;
    color: #4da3ff;
    // 等宽数字：多位数值跳动时列宽不抖
    font-variant-numeric: tabular-nums;
  }

  &__unit {
    margin-left: 6px;
    font-size: 14px;
    color: #8fa8d8;
  }

  &__trend {
    margin-top: 6px;
    font-size: 14px;

    &--up {
      color: #f56c6c;
    }

    &--down {
      color: #2fd39a;
    }

    &--flat {
      color: #8fa8d8;
    }
  }
}
</style>
