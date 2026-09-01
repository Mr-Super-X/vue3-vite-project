/**
 * 栅格布局类型 —— element-plus el-row / el-col 配置
 */

/** Col 响应式断点(同 ColConfig 子字段) */
export interface ResponsiveColConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
}

/** 栅格（el-row） */
export interface RowConfig {
  gutter?: number
  type?: 'flex'
  align?: string
  justify?: string
  /**
   * Row 响应式 —— element-plus 标准 5 档
   * - xs: < 768px(手机)
   * - sm: ≥ 768px(平板)
   * - md: ≥ 992px(小屏)
   * - lg: ≥ 1200px(桌面)
   * - xl: ≥ 1920px(大屏)
   * 每个断点可独立设置 gutter / type / align / justify
   * 注:element-plus el-row 不自动监听 viewport resize —— 运行时响应式联动
   * 需 XForm 内部 useResizeObserver 触发 schema 重渲染(留 P2 阶段)
   */
  responsive?: {
    xs?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    sm?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    md?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    lg?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    xl?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
  }
}
/** 栅格（el-col） */
export interface ColConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
  /**
   * Col 响应式 —— element-plus 标准 5 档
   * 每个断点可独立设置 span / offset / push / pull
   * 渲染时透传给 el-col(传对象时 el-col 自动按 viewport 选)
   */
  responsive?: {
    xs?: ResponsiveColConfig
    sm?: ResponsiveColConfig
    md?: ResponsiveColConfig
    lg?: ResponsiveColConfig
    xl?: ResponsiveColConfig
  }
}
