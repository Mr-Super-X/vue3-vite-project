/**
 * 第三方库 vendor chunk 分组（顺序敏感——先匹配先返回）
 * 新增分组只需追加一项。
 *
 * 命名约定：`vendor-<主题>`，按包大小 / 加载频率决定排序：
 *   - vendor-vue: Vue 核心（vue / vue-router / pinia / @vue/*）
 *   - vendor-ui: UI 库（element-plus / unplugin-vue-components）——变更较频繁
 *   - vendor-charts: 图表库（echarts）——独立拆 chunk 避免污染 vendor-ui 的缓存命中
 *
 * 单独拆 echarts 的原因（2026-09-10）：echarts 包体 ~1MB，混入 vendor-ui 会让
 * 升级 EP 时连带把 echarts 也下载；独立 chunk 利于按 chunk 缓存复用
 */
export const VENDOR_CHUNKS: ReadonlyArray<{
  name: string
  patterns: ReadonlyArray<string>
}> = [
  {
    name: 'vendor-vue',
    patterns: ['/vue/', '/pinia/', '/@vue/'],
  },
  {
    name: 'vendor-ui',
    patterns: ['/element-plus/', '/unplugin-vue-components/'],
  },
  {
    name: 'vendor-charts',
    patterns: ['/echarts/'],
  },
]
