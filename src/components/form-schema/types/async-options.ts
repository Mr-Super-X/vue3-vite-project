/**
 * 异步选项类型 —— Select/Cascader/TreeSelect/Autocomplete 内置远程数据能力
 */

/** 异步选项配置：为 Select/Cascader/TreeSelect/Autocomplete 等提供内置远程数据能力 */
export interface AsyncOptionsConfig<T = unknown> {
  /** 数据源函数，返回原始数据数组（支持 Promise）；Autocomplete 场景可接收可选 query 参数 */
  source: (query?: string) => Promise<T[]> | T[]
  /** 是否在节点创建时立即请求（默认 true） */
  immediate?: boolean
  /** 依赖字段路径（lodash 路径），任一依赖变化时重新请求 */
  deps?: string | string[]
  /** 数据转换：把 source 返回的原始数组转为组件需要的 { label, value } 数组 */
  transform?: (raw: T[]) => Array<{ label: string; value: unknown }>
  /** 请求出错时回调（默认仅写入内部 error 状态） */
  onError?: (err: unknown) => void
}
