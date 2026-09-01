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

// 行级稳定 key：按行对象身份（WeakMap）分配，而非 index。
// index 作 key 时删/移一行会导致后续所有行重挂载（焦点丢失、内部组件状态与校验状态错位）；
// 对象行在 splice/move 后身份不变 → key 稳定 → Vue 只移动 DOM 不重挂载。
// 原始值行（string/number）无对象身份，退回 index（极少见场景）。
//
// WeakMap 跨渲染存活是必要的：renderRow 每次渲染重建，key 必须跨渲染稳定；
// 行对象被 GC 时条目自动回收，不会泄漏。
//
// OPT-5：原 rowKeySeq 模块级计数器永增不回收（长时间运行下接近 2^53 上限），
// 改为 crypto.randomUUID() 短码 —— 无全局计数器，UUID 重复概率可忽略。
const rowKeyMap = new WeakMap<object, string>()
function rowKeyOf(row: unknown, index: number): string {
  if (row !== null && typeof row === 'object') {
    let k = rowKeyMap.get(row as object)
    if (!k) {
      k = `r${newShortUid()}`
      rowKeyMap.set(row as object, k)
    }
    return k
  }
  return `i${index}`
}

/**
 * 短 UUID 生成 —— 8 字符前缀，重复概率 1/2^32 = 可忽略
 * 优先使用 crypto.randomUUID()（Node 19+/所有现代浏览器），
 * 旧环境 fallback 到 time+random 组合
 */
function newShortUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 把子 schema 的 name 路径前缀化,让 el-form 能按 list.0.qty 形式做嵌套校验
 * - 递归处理 children / formItem.slots / slots
 * - 子节点为空 / 字符串时原样返回
 * - keyPrefix（可选）：按行对象身份生成 node.key —— name 是位置路径（校验用），
 *   key 是身份标识（vnode diff 用）；不传则保持原行为（key 不受影响）
 */
export function rewriteNamePath(
  sub: SchemaNode | SchemaNode[] | string | undefined,
  prefix: string,
  sep: string,
  keyPrefix?: string
): SchemaNode | SchemaNode[] | string | undefined {
  if (sub === undefined || sub === null) return sub
  if (typeof sub === 'string') return sub
  if (Array.isArray(sub)) {
    return sub.map((s) => rewriteNamePath(s, prefix, sep, keyPrefix) as SchemaNode)
  }
  const cloned: SchemaNode = { ...sub }
  const originalName = cloned.name
  if (originalName) {
    cloned.name = `${prefix}${sep}${originalName}`
    // 用户显式配置的 key 优先；否则用行身份前缀派生稳定 key
    if (keyPrefix && cloned.key === undefined) cloned.key = `${keyPrefix}${sep}${originalName}`
  }
  if (cloned.children !== undefined) {
    cloned.children = rewriteNamePath(cloned.children, prefix, sep, keyPrefix) as never
  }
  if (cloned.slots) {
    const newSlots: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cloned.slots)) {
      if (typeof v === 'function') {
        newSlots[k] = v
      } else if (v && typeof v === 'object') {
        newSlots[k] = rewriteNamePath(v, prefix, sep, keyPrefix)
      } else {
        newSlots[k] = v
      }
    }
    cloned.slots = newSlots as never
  }
  if (cloned.formItem && typeof cloned.formItem === 'object' && cloned.formItem.slots) {
    const newFormItemSlots: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cloned.formItem.slots)) {
      if (typeof v === 'function') {
        newFormItemSlots[k] = v
      } else if (v && typeof v === 'object') {
        newFormItemSlots[k] = rewriteNamePath(v, prefix, sep, keyPrefix)
      } else {
        newFormItemSlots[k] = v
      }
    }
    cloned.formItem = { ...cloned.formItem, slots: newFormItemSlots as never }
  }
  return cloned
}

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
