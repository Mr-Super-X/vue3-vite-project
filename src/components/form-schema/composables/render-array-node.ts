/**
 * 数组节点渲染（kind === 'array'）：ElCard + 标题 + 添加按钮 + 每行 ElFormItem + 行尾按钮，
 * name 路径自动前缀化为 `items[i].subName`（el-form 按嵌套路径校验）。
 *
 * 类型断言（`as never`）归因见 types/TYPE-CAST-AUDIT.md。
 *
 * @group 表单编排：渲染
 */
import { h, type VNode } from 'vue'
import { ElCard, ElButton } from 'element-plus'
import { get } from 'lodash-es'
import type { SchemaNode } from '../types'
import { resolveLabel } from '../utils/resolve-label'
import { mergeColResponsive } from './barrel'
import type { RenderSchemaNodeOptions } from './render-schema-node'
import { rowKeyOf, rewriteNamePath } from './array-row-key'

/**
 * 拖拽排序的瞬时 UI 状态（设计师审查 F7：落点指示线 + 源行拖拽态）
 *
 * 模块级 ref：同一时刻用户只在一个数组上拖拽，无需实例隔离；
 * render effect 内 .value 读取建立响应式依赖，dragenter/dragleave/drop 时改值触发重渲
 */
import { ref } from 'vue'
const dragSourceIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const dropPosition = ref<'before' | 'after'>('after')

/** renderArrayNode —— 数组节点渲染（kind='array'，ElCard + 行 + 行内控件） */
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

  // P0-3 修复：嵌套 array 场景下 listName 是嵌套路径（如 orders[0].items），
  // 直接 model[listName] 只能读顶层 key。改用 lodash get 解析嵌套路径。
  const listRaw = get(opts.model ?? {}, listName)
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
    // P2-3 拖拽排序：draggable 开启时整行可拖
    // F7 增强（设计师审查）：dragover 计算鼠标在行内上半/下半 → 渲染 2px 落点指示线；
    // dragstart 给源行加 .is-dragging 半透明；drop/dragend 清状态
    const dndProps =
      cfg.draggable === true
        ? {
            draggable: true,
            onDragstart: (e: DragEvent) => {
              e.dataTransfer?.setData('text/xform-array-row', String(index))
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
              dragSourceIndex.value = index
            },
            onDragover: (e: DragEvent) => {
              e.preventDefault() // 必须 preventDefault 才允许 drop
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
              // 计算鼠标在行内的垂直位置：上半 → before（插到当前行之前），下半 → after
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const ratio = (e.clientY - rect.top) / rect.height
              dropTargetIndex.value = index
              dropPosition.value = ratio < 0.5 ? 'before' : 'after'
            },
            onDragleave: () => {
              // 鼠标离开本行时清落点指示（进入下一行时 dragover 会重设）
              if (dropTargetIndex.value === index) {
                dropTargetIndex.value = null
              }
            },
            onDrop: (e: DragEvent) => {
              e.preventDefault()
              const from = Number(e.dataTransfer?.getData('text/xform-array-row'))
              if (Number.isInteger(from) && from !== index) {
                // 落点换算：before = 插到 index 之前（即 from → index-1）；after = 插到 index 之后
                const target = dropPosition.value === 'before' ? index - 1 : index
                opts.arrayActions?.moveItem(listName, from, target)
              }
              dragSourceIndex.value = null
              dropTargetIndex.value = null
            },
            onDragend: () => {
              dragSourceIndex.value = null
              dropTargetIndex.value = null
            },
          }
        : {}
    // F7：源行拖拽态 + 落点指示 class
    const dndClass =
      cfg.draggable === true
        ? [
            dragSourceIndex.value === index ? 'is-dragging' : '',
            dropTargetIndex.value === index
              ? dropPosition.value === 'before'
                ? 'is-drop-before'
                : 'is-drop-after'
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        : ''
    return h(
      'div',
      {
        key: `array-${listName}-${rowKey}`,
        class: [
          `${typeof node.component === 'string' ? node.component.toLowerCase() : 'array-node'}__row`,
          dndClass,
        ]
          .filter(Boolean)
          .join(' '),
        ...dndProps,
      } as Record<string, unknown>,
      {
        default: () => [
          h('div', { class: 'array-node__row-body' } as Record<string, unknown>, {
            default: () => (inner && !Array.isArray(inner) ? [inner] : (inner as never)),
          }) as VNode,
          h('div', { class: 'array-node__row-actions' } as Record<string, unknown>, {
            // 类型归因：ElButton 与 h() 第一参 union 不等价（C1 根因，详见 types/TYPE-CAST-AUDIT.md）；
            // 运行时已验证 render 正常，TS 层用 as never 兜底。
            default: () =>
              [
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index === 0,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index - 1),
                    } as Record<string, unknown>,
                    { default: () => labelUp }
                  ),
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index >= list.length - 1,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index + 1),
                    } as Record<string, unknown>,
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
                    } as Record<string, unknown>,
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
    } as Record<string, unknown>,
    {
      default: () => [
        h('div', { class: 'array-node__header' } as Record<string, unknown>, {
          default: () =>
            [
              h('span', { class: 'array-node__title' } as Record<string, unknown>, {
                default: () => cfg.title ?? resolveLabel(node.label, opts.t) ?? listName,
              }) as VNode,
              showAdd &&
                h(
                  ElButton as never,
                  {
                    type: 'primary',
                    size: 'small',
                    disabled: list.length >= max,
                    onClick: () => opts.arrayActions?.addItem(listName),
                  } as Record<string, unknown>,
                  { default: () => labelAdd }
                ),
            ].filter(Boolean) as never,
        }) as VNode,
        h('div', { class: 'array-node__body' } as Record<string, unknown>, {
          default: () =>
            list.length === 0
              ? [
                  h('div', { class: 'array-node__empty' } as Record<string, unknown>, {
                    // 引用实际 labelAdd（默认「添加」，可配 labels.add），避免文案与按钮实际文案不一致
                    default: () => `暂无数据，点击上方「${labelAdd}」按钮添加一行`,
                  }) as VNode,
                ]
              : (list.map((row, i) => renderRow(row, i)) as never),
        }) as VNode,
      ],
    }
  ) as VNode
}
