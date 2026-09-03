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

/**
 * SchemaNode 命名空间 —— 数据加载（1 字段）
 *
 * P2-1 拆分：原 SchemaNode 31 字段拆为 9 个命名空间接口，本文件定义「数据加载」子集：
 * asyncOptions —— Select/Cascader/TreeSelect/Autocomplete 等的远程数据源。
 *
 * 业务用法：
 * - 直接 import 此接口用于"只需异步选项 + 其他命名空间字段"的子类型场景
 * - 通过 SchemaNode（schema-node.ts）使用全部 9 个命名空间
 *
 * 不变量：
 * - SchemaNode extends 全部 9 个命名空间，TS 接口展平后类型形状与 P2-1 重构前完全等价
 * - 字段 JSDoc verbatim 拷贝自原 schema-node.ts，IDE hover 不变
 */

/**
 * SchemaNodeData —— 数据加载（asyncOptions）
 */
export interface SchemaNodeData {
  /**
   * 异步选项数据源（Select/Cascader/TreeSelect/Autocomplete）
   * @group 数据加载
   */
  asyncOptions?: AsyncOptionsConfig
}
