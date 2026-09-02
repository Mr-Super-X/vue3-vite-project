/**
 * 数组节点渲染（kind === 'array'）
 * - 外层 ElCard + 标题 + 添加按钮（顶部）
 * - 每行 ElFormItem（继承父数组节点的 label） + itemSchema 渲染 + 行尾按钮（上移/下移/删除）
 * - min/max 边界禁用对应按钮
 * - name 路径自动前缀化为 items[i].subName（el-form 按嵌套路径校验）
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 类型断言归因（OPT-3）
 * 本文件中 `as never` 集中在 h() 调用处（ElButton / ElCard / ElFormItem 类型元组）。
 * 这是 vue 3 + element-plus 2.x 类型系统的已知缺陷：
 *   - h(Component, props, slots) 中 props 的精确类型推导要求 Component 是
 *     ComponentPublicInstanceConstructor，但 Element Plus 仅导出泛型构造器
 *   - 业务侧通过 `Component as never` 跳过元组校验，运行时由 Vue 内置组件解析
 *     完成 props/slots 校验
 * 不要在没有充分理由时移除这些 cast —— Element Plus 3.0 升级窗口期再评估
 *
 * 完整归因表（C1-C9 根因分类 + 文件分布）见 `../types/TYPE-CAST-AUDIT.md`。
 * ────────────────────────────────────────────────────────────────────────────
 */
import { h, type VNode } from 'vue'
import { ElCard, ElButton } from 'element-plus'
import type { SchemaNode } from '../types'
import { mergeColResponsive } from './render-schema-node'
import type { RenderSchemaNodeOptions } from './render-schema-node'
import { rowKeyOf, rewriteNamePath } from './array-row-key'

export function renderArrayNode(
  node: SchemaNode,
  opts: RenderSchemaNodeOptions
): VNode | undefined {
  if (!node.array) return undefined
  const listName = node.name
  if (!listName) return undefined
  const cfg = node.array
  // el-form prop 路径必须用 items[0].qty 语法（方括号包裹数字索引），不能用 items.0.qty
  const sep = '.'
  const showActions = cfg.showActions ?? true
  const showAdd = typeof showActions === 'object' ? showActions.add !== false : showActions
  const showRemove = typeof showActions === 'object' ? showActions.remove !== false : showActions
  const showMove = typeof showActions === 'object' ? showActions.move !== false : showActions
  const labelAdd = cfg.labels?.add ?? '添加'
  const labelRemove = cfg.labels?.remove ?? '删除'
  const labelUp = cfg.labels?.moveUp ?? '上移'
  const labelDown = cfg.labels?.moveDown ?? '下移'

  const listRaw = opts.model?.[listName]
  const list: unknown[] = Array.isArray(listRaw) ? listRaw : []
  const min = cfg.minItems ?? 0
  const max = cfg.maxItems ?? Infinity

  const renderRow = (row: unknown, index: number): VNode => {
    const rowKey = rowKeyOf(row, index)
    // name 前缀 = 位置路径（el-form 校验用，随 index 走）；
    // keyPrefix = 行对象身份（vnode key 用，随行数据走）——两者必须分离，
    // 否则删/移行后内部 form-item 的 key（fi-items[0].qty）漂移，整行重挂载
    const rewritten = rewriteNamePath(
      cfg.itemSchema,
      `${listName}[${index}]`,
      sep,
      `${listName}#${rowKey}`
    )
    const inner = rewritten
      ? opts.render({
          ...(rewritten as object),
          col: mergeColResponsive((rewritten as SchemaNode).col, opts.currentBreakpoint?.value),
        } as SchemaNode)
      : undefined
    // P2-3 拖拽排序：draggable 开启时整行可拖（dragover 高亮目标行，drop 调 moveItem 换位）
    const dndProps =
      cfg.draggable === true
        ? {
            draggable: true,
            onDragstart: (e: DragEvent) => {
              e.dataTransfer?.setData('text/xform-array-row', String(index))
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
            },
            onDragover: (e: DragEvent) => {
              e.preventDefault() // 必须 preventDefault 才允许 drop
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
            },
            onDrop: (e: DragEvent) => {
              e.preventDefault()
              const from = Number(e.dataTransfer?.getData('text/xform-array-row'))
              if (Number.isInteger(from) && from !== index) {
                opts.arrayActions?.moveItem(listName, from, index)
              }
            },
          }
        : {}
    return h(
      'div',
      {
        key: `array-${listName}-${rowKey}`,
        class: `${typeof node.component === 'string' ? node.component.toLowerCase() : 'array-node'}__row`,
        ...dndProps,
      } as never,
      {
        default: () => [
          h('div', { class: 'array-node__row-body' } as never, {
            default: () => (inner && !Array.isArray(inner) ? [inner] : (inner as never)),
          }) as VNode,
          h('div', { class: 'array-node__row-actions' } as never, {
            default: () =>
              [
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index === 0,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index - 1),
                    } as never,
                    { default: () => labelUp }
                  ),
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index >= list.length - 1,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index + 1),
                    } as never,
                    { default: () => labelDown }
                  ),
                showRemove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      type: 'danger',
                      disabled: list.length <= min,
                      onClick: () => opts.arrayActions?.removeItem(listName, index),
                    } as never,
                    { default: () => labelRemove }
                  ),
              ].filter(Boolean) as never,
          }) as VNode,
        ],
      }
    ) as VNode
  }

  return h(
    ElCard as never,
    {
      shadow: 'never',
      class: 'array-node',
      ...(node.props ?? {}),
    } as never,
    {
      default: () => [
        h('div', { class: 'array-node__header' } as never, {
          default: () =>
            [
              h('span', { class: 'array-node__title' } as never, {
                default: () => cfg.title ?? node.label ?? listName,
              }) as VNode,
              showAdd &&
                h(
                  ElButton as never,
                  {
                    type: 'primary',
                    size: 'small',
                    disabled: list.length >= max,
                    onClick: () => opts.arrayActions?.addItem(listName),
                  } as never,
                  { default: () => labelAdd }
                ),
            ].filter(Boolean) as never,
        }) as VNode,
        h('div', { class: 'array-node__body' } as never, {
          default: () =>
            list.length === 0
              ? [
                  h('div', { class: 'array-node__empty' } as never, {
                    default: () => '暂无数据,点击右上角「添加」按钮新增',
                  }) as VNode,
                ]
              : (list.map((row, i) => renderRow(row, i)) as never),
        }) as VNode,
      ],
    }
  ) as VNode
}
