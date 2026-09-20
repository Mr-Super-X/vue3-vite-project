/**
 * 门户总览数据类型（与 `@/api/modules/portal-overview` 接口响应一一对应）。
 *
 * - `TrendDirection`：单一字符字面量联合，避免 enum 跨平台打包膨胀
 * - `OverviewCardDto`：卡片是总览基本单位，每张卡片含若干 `OverviewMetricDto`
 * - `iconBg`：背景色 hex 值（如 `'#3b82f6'`），由 API 返回，组件直接消费
 *
 * @see [`@/api/modules/portal-overview`](../../../api/modules/portal-overview.ts) 接口
 * @see [`../store/portal-overview`](../store/portal-overview.ts) 状态层
 * @see [`../components/OverviewSection.vue`](../components/OverviewSection.vue) 渲染方
 * @group 业务模块：Home
 */
export type TrendDirection = 'up' | 'down' | 'flat'

/**
 * 单个指标项（卡片内）。
 * - `value` 允许 number / string 是因为后端可能返回"100+"这类展示型字符串
 */
export interface OverviewMetricDto {
  label: string
  unit?: string
  value: number | string
  trend: TrendDirection
  trendText: string
}

/**
 * 单张总览卡片。
 * - `code` 是后端约定的业务码，UI 渲染时不展示，前端可基于此做埋点分流
 * - `viewDetailPath` 缺省时不渲染"查看详情"按钮
 */
export interface OverviewCardDto {
  code: string
  title: string
  iconName: string
  iconBg: string
  metrics: OverviewMetricDto[]
  viewDetailPath?: string
}
