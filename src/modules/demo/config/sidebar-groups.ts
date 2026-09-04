/**
 * demo 页左侧 sidebar 的分组与中文名映射
 *
 * 新增 demo 组件（examples/ 下）时：只需在 CN_NAMES 补一条中文名，
 * 分组按 getSidebarGroup 的前缀规则自动归类，无需改 DocLayout。
 */

/** 分组定义：按顺序匹配，第一个命中的生效；最后一组（空前缀）为兜底组 */
export interface SidebarGroupConfig {
  /** 组标题 */
  title: string
  /** 组件名前缀（空字符串 = 匹配所有） */
  prefix: string
}

export const SIDEBAR_GROUPS: readonly SidebarGroupConfig[] = [
  { title: 'XForm 表单引擎', prefix: 'XForm' },
  { title: '通用组件', prefix: '' },
]

/** 组件名 → 简短中文名（sidebar 显示为「组件名 中文名」） */
export const CN_NAMES: Record<string, string> = {
  XForm: '用法总览',
  XFormArray: '数组节点',
  XFormArrayApi: '数组节点 API',
  XFormArrayDraggable: '数组行拖拽排序',
  XFormAsyncOptions: '异步选项',
  XFormAsyncOptionsError: '异步选项·错误处理',
  XFormAsyncValidator: '异步校验',
  XFormBase: '基础用法',
  XFormBeforeChange: '字段值拦截·3 层',
  XFormBuilder: '链式构建器',
  XFormCrossField: '跨字段校验',
  XFormCrossFieldReverse: '反向跨字段',
  XFormCustomComponent: '自定义组件注册',
  XFormCustomFormItem: '自定义 form-item',
  XFormDetailFill: '详情数据回填',
  XFormDirty: '脏状态追踪',
  XFormDirectives: '节点指令与全局配置',
  XFormDisabled: '禁用状态',
  XFormEvents: '字段事件与值拦截',
  XFormExpression: '动态脚本表达式',
  XFormExpressionSandbox: '表达式沙箱与白名单',
  XFormFieldPermission: '字段权限',
  XFormGrid: '栅格布局',
  XFormInvalidComponent: '无效组件校验',
  XFormLargeSchema: '大 schema 性能',
  XFormLabelLayout: 'label 布局',
  XFormMinimumDemo: '最小示例',
  XFormModelWarn: 'model 缺失警告',
  XFormNested: '复杂布局',
  XFormNestedArray: '嵌套数组节点',
  XFormOrderCreate: '端到端业务示例（订单创建页）',
  XFormPersist: '草稿持久化',
  XFormPersistSchemaVersion: '草稿持久化·schema 版本',
  XFormPropsAdvanced: 'XFormProps 高级配置',
  XFormReaction: '反应式联动',
  XFormReactionAdvanced: '反应式联动·进阶',
  XFormReactionDeps: '反应式联动·deps 动机',
  XFormReactionStrategy: '反应式联动·调度策略',
  XFormGlobalDisabled: '全局禁用',
  XFormGlobalReadonly: '全局只读',
  XFormIgnore: '节点忽略',
  XFormValidationDebounce: '实时校验和debounce',
  XFormResponsive: '响应式布局',
  XFormSchemaIndex: '索引快照',
  XFormScrollToError: '错误自动滚动',
  XFormServerError: '服务端错误',
  XFormSlots: '插槽系统',
  XFormStyleOverride: '样式覆盖',
  XFormUpload: '文件上传',
  XFormValidateDetail: 'validateDetail 详细返回',
  XFormValidateField: '逐字段校验',
  XFormZod: 'zod 校验',
  AsyncState: '异步状态容器',
  ErrorBoundary: '错误边界',
}

/** 返回组件名所属分组标题（未命中任何前缀时归入兜底组） */
export function getSidebarGroup(componentName: string): string {
  for (const group of SIDEBAR_GROUPS) {
    if (group.prefix === '' || componentName.startsWith(group.prefix)) return group.title
  }
  return SIDEBAR_GROUPS[SIDEBAR_GROUPS.length - 1]!.title
}

/** 组装 sidebar 显示名：组件名 + 空格 + 中文名（无映射时仅组件名） */
export function getSidebarLabel(componentName: string): string {
  const cn = CN_NAMES[componentName]
  return cn ? `${componentName} ${cn}` : componentName
}
