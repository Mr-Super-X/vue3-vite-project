/**
 * SchemaNode 命名空间 —— 节点标识（4 字段）
 *
 * P2-1 拆分：原 SchemaNode 31 字段拆为 9 个命名空间接口，本文件定义「节点标识」子集：
 * component / name / label / key —— 标记节点身份与 v-for key 的最小字段集。
 *
 * 业务用法：
 * - 直接 import 此接口用于"只需节点标识 + 其他命名空间字段"的子类型场景
 * - 通过 SchemaNode（schema-node.ts）使用全部 9 个命名空间
 *
 * 不变量：
 * - SchemaNode extends 全部 9 个命名空间，TS 接口展平后类型形状与 P2-1 重构前完全等价
 * - 字段 JSDoc verbatim 拷贝自原 schema-node.ts，IDE hover 不变
 */

/**
 * 组件 —— 支持三种形式：
 * - EL 组件名：string（内置短名如 'Input' / 全名 'ElInput' / components prop 注册名）
 * - 原生 HTML 标签：string（全小写，如 'a' / 'span' / 'div'），直接渲染原生元素
 * - Component 对象：直接传入 Vue 组件实例/选项对象（无需在 XForm 的 components prop 注册）
 *
 * 推荐：EL 组件用 string 形式 + XForm 集中注册；slots 内的 trigger 元素也支持直接传 Component 对象
 * @group 节点标识
 */
export interface SchemaNodeIdentity {
  component?: string | object
  /**
   * 表单字段名 —— 绑定 model[name] 用于 el-form 数据收集与校验路径
   * 数组节点必填（items[*] 等）；纯 UI 节点（如 Card）可不填
   * @group 节点标识
   */
  name?: string
  /**
   * el-form-item label 文本（左侧/上方/右侧 由 labelPosition 决定）
   * @group 节点标识
   */
  label?: string
  /**
   * v-for key（数组行用行对象身份前缀派生稳定 key；详见 array-row-key.ts）
   * key 优先级 > name（数组删/移行后 name 漂移会导致 form-item 重挂载）
   * @group 节点标识
   */
  key?: string | number
}
