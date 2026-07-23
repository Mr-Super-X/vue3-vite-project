export type TrendDirection = 'up' | 'down' | 'flat'

export interface OverviewMetricDto {
  label: string
  unit?: string
  value: number | string
  trend: TrendDirection
  trendText: string
}

export interface OverviewCardDto {
  code: string
  title: string
  iconName: string
  iconBg: string
  metrics: OverviewMetricDto[]
  viewDetailPath?: string
}
