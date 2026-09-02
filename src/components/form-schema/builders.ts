/**
 * XForm schema 链式构建器
 *
 * 设计目标："XForm 使用门槛低" —— 对标 FormRender 的链式 API
 *
 * 架构（OPT-2 重构后）：
 * 1. NodeBuilder<C> —— 泛型基类，绑死 component 名 + props 类型
 *    通过 `class extends NodeBuilder` 直接继承所有链式方法（label/prop/required/...）
 *    无需在子类中重复声明
 * 2. makeBuilder(componentName) —— 工厂返回一个继承 NodeBuilder 的 class，
 *    子类只需实现 component-specific 方法（clearable/options/format/...）
 * 3. 27 个 xXxx 入口函数（含 xArray）= makeBuilder(componentName).Ext 实例
 *
 * 类型推导：
 * - xInput() → Builder<'Input', ElInputProps> → build() 返回 SchemaNodeFor<'Input'>
 * - xSelect() → Builder<'Select', ElSelectProps>
 * - ...
 *
 * 这样 IDE 在链式调用时自动补全 props 字段名 + 校验 props 值类型
 *
 * ────────────────────────────────────────────────────────────────────────────
 * OPT-2 重构要点：
 * - 删除原 makeBuilder 内 ~60 行方法复制粘贴
 * - 删除原 Ext 类中 5 处 `_b` 反射访问
 * - 行数：537 → 280（去掉 makeBuilder 内 13 方法 × 25 builder 复制）
 * - 公开 API 完全兼容，所有现有测试无需修改
 * ────────────────────────────────────────────────────────────────────────────
 * P0-1 重构要点（2026-09-01 易用性优化）：
 * - 按 component 名字母 A-Z 分组，每个 component 包含「makeBuilder 工厂 + Ext 子类 + xXxx 入口」三件套
 * - 旧结构：25 个工厂集中 + 12 个 Ext 子类分散 + 27 个入口函数集中
 * - 新结构：每个 component 独立一节，查找 builder 能力从跨 2-3 处跳转 → 同 1 节内查找
 * - 公开 API 完全兼容
 * ────────────────────────────────────────────────────────────────────────────
 */
import type {
  SchemaNode,
  SchemaNodeFor,
  ComponentName,
  ComponentPropsRegistry,
  RuleItem,
  ReactionValue,
} from './types'

// ────────────────────────────────────────────────────────────────────────────
// 链式构建器基类
// ────────────────────────────────────────────────────────────────────────────

/**
 * 链式构建器泛型基类
 * - C：绑死的 component 名（决定 SchemaNodeFor<C> 类型）
 * - P：组件 props 类型（默认从 ComponentPropsRegistry 推导）
 *
 * 所有方法返回 `this` —— 链式调用通过原型链继承自动可用
 */
export class NodeBuilder<C extends ComponentName, P = ComponentPropsRegistry[C]> {
  // public 供 Ext 子类（如 CardBuilderExt.column / RadioGroupBuilderExt.options）直接访问
  node: Partial<SchemaNodeFor<C>> = {}

  constructor(componentName: C, name?: string) {
    if (name !== undefined) this.node.name = name
    this.node.component = componentName
  }

  label(label: string): this {
    this.node.label = label
    return this
  }

  defaultValue(v: P extends { defaultValue?: infer D } ? D : unknown): this {
    this.node.defaultValue = v
    return this
  }

  placeholder(p: string): this {
    const n = this.node as { props?: Record<string, unknown> }
    n.props = { ...(n.props ?? {}), placeholder: p }
    return this
  }

  prop(key: string, value: unknown): this {
    const n = this.node as { props?: Record<string, unknown> }
    n.props = { ...(n.props ?? {}), [key]: value }
    return this
  }

  /** 字段禁用状态 —— 支持反应式（boolean / 函数 / 函数表达式） */
  disabled(v: ReactionValue<boolean>): this {
    this.node.disabled = v
    return this
  }

  /** callback 风格 validator(async-validator 兼容,同步或异步均可)
   *  - 多次调用会 push 多个 rule 到 rules 数组
   *  - 典型 async 用法:fn 内部调用 cb(new Error(...)) 或 cb() 表示失败/通过 */
  validator(
    fn: (rule: unknown, value: unknown, cb: (err?: Error) => void) => void,
    trigger: 'blur' | 'change' = 'blur'
  ): this {
    const n = this.node as { rules?: string | RuleItem | Array<string | RuleItem> }
    const arr = Array.isArray(n.rules) ? n.rules : n.rules !== undefined ? [n.rules] : []
    arr.push({ validator: fn as never, trigger })
    n.rules = arr as never
    return this
  }

  /** async 风格 validator 简写 —— 内部自动包成 callback 风格
   *  - fn 必须**内部**调 cb(成功 cb() / 失败 cb(Error))
   *  - 包装层不主动调 cb(避免覆盖 fn 内部调用)
   *  - 仅在 fn 抛错/返回 rejected Promise 时调 cb(Error),防止 fn 忘记调 cb 导致 el-form 永久等待 */
  asyncValidator(
    fn: (rule: unknown, value: unknown, cb: (err?: Error) => void) => Promise<unknown>,
    trigger: 'blur' | 'change' = 'blur'
  ): this {
    return this.validator((rule, value, cb) => {
      fn(rule, value, cb).catch((err: unknown) =>
        cb(err instanceof Error ? err : new Error(String(err)))
      )
    }, trigger)
  }

  required(message = '必填'): this {
    const n = this.node as { rules?: RuleItem[] | string }
    if (Array.isArray(n.rules)) n.rules.push({ required: true, message, trigger: 'blur' })
    // 字符串是命名规则引用 —— 保留引用并追加 required（此前整体覆盖导致命名规则丢失 H10）
    else if (typeof n.rules === 'string')
      n.rules = [n.rules, { required: true, message, trigger: 'blur' }] as never
    else n.rules = [{ required: true, message, trigger: 'blur' }]
    return this
  }

  rules(rules: RuleItem[] | string): this {
    this.node.rules = rules
    return this
  }

  hidden(flag = true): this {
    this.node.hidden = flag
    return this
  }

  ignore(flag = true): this {
    this.node.ignore = flag
    return this
  }

  col(span: number): this {
    this.node.col = { span }
    return this
  }

  reaction(r: NonNullable<SchemaNode['reaction']>): this {
    this.node.reaction = r
    return this
  }

  build(): SchemaNodeFor<C> {
    return this.node as SchemaNodeFor<C>
  }
}

/**
 * 通用 builder 工厂：返回绑死 component 名的类（extends NodeBuilder）
 * 原实现需在工厂内重复声明 13 个方法转发到 _b；重构后通过原型继承直接获得全部方法
 */
function makeBuilder<C extends ComponentName>(
  componentName: C
): new (name: string) => NodeBuilder<C, ComponentPropsRegistry[C]> {
  class BasicBuilder extends NodeBuilder<C, ComponentPropsRegistry[C]> {
    constructor(name: string) {
      super(componentName, name)
    }
  }
  return BasicBuilder as new (name: string) => NodeBuilder<C, ComponentPropsRegistry[C]>
}

/**
 * 极简 builder 工厂：返回 (fieldName: string) => NodeBuilder 实例
 * 用于没有 component-specific 链式方法的纯组件（InputPassword/ColorPicker/Mention/Rate/...）
 * 取代原来「const XxxBuilder = makeBuilder + export const xXxx = (n) => new XxxBuilder(n)」2 行模板
 */
const makeSimpleBuilder =
  <C extends ComponentName>(componentName: C) =>
  (fieldName: string): NodeBuilder<C> =>
    new (makeBuilder(componentName))(fieldName)

// ────────────────────────────────────────────────────────────────────────────
// 27 个 component builder（按字母 A-Z 排序）
// 每个 component 三件套：makeBuilder 工厂 + Ext 子类 + xXxx 入口函数
// ────────────────────────────────────────────────────────────────────────────

// ── Autocomplete ──
const AutocompleteBuilder = makeBuilder('Autocomplete')
class AutocompleteBuilderExt extends AutocompleteBuilder {
  fetchSuggestions(
    fn: (queryString: string, cb: (suggestions: Array<{ value: string }>) => void) => void
  ): this {
    return this.prop('fetchSuggestions', fn as never)
  }
  triggerOnFocus(): this {
    return this.prop('triggerOnFocus', true)
  }
  placement(p: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'): this {
    return this.prop('placement', p)
  }
}
export const xAutocomplete = (name: string) => new AutocompleteBuilderExt(name)

// ── Cascader ──
const CascaderBuilder = makeBuilder('Cascader')
class CascaderBuilderExt extends CascaderBuilder {
  options(opts: Array<unknown>): this {
    return this.prop('options', opts)
  }
  showAllLevels(): this {
    return this.prop('showAllLevels', true)
  }
  separator(s: string): this {
    return this.prop('separator', s)
  }
  // el-cascader 的 expandTrigger 在 props 嵌套字段中,需要 props.expandTrigger
  // 简化:用 prop() 直接覆盖整个 props(覆盖式更新),文档说明限制
}
export const xCascader = (name: string) => new CascaderBuilderExt(name)

// ── Card ──
const CardBuilder = makeBuilder('Card')
class CardBuilderExt extends CardBuilder {
  title(t: string): this {
    return this.prop('title', t)
  }
  column(c: number): this {
    this.node.column = c
    return this
  }
  gutter(g: number): this {
    this.node.row = { gutter: g }
    return this
  }
}
export const xCard = (name: string) => new CardBuilderExt(name)

// ── Checkbox ──
export const xCheckbox = makeSimpleBuilder('Checkbox')

// ── CheckboxGroup ──
export const xCheckboxGroup = makeSimpleBuilder('CheckboxGroup')

// ── ColorPicker ──
export const xColorPicker = makeSimpleBuilder('ColorPicker')

// ── DatePicker ──
const DatePickerBuilder = makeBuilder('DatePicker')
class DatePickerBuilderExt extends DatePickerBuilder {
  format(v: string): this {
    return this.prop('valueFormat', v)
  }
}
export const xDatePicker = (name: string) => new DatePickerBuilderExt(name)

// ── Input ──
const InputBuilder = makeBuilder('Input')
class InputBuilderExt extends InputBuilder {
  clearable(): this {
    return this.prop('clearable', true)
  }
}
export const xInput = (name: string) => new InputBuilderExt(name)

// ── InputNumber ──
export const xInputNumber = makeSimpleBuilder('InputNumber')

// ── InputPassword ──
export const xInputPassword = makeSimpleBuilder('InputPassword')

// ── InputTag ──
export const xInputTag = makeSimpleBuilder('InputTag')

// ── InputTextArea ──
export const xInputTextArea = makeSimpleBuilder('InputTextArea')

// ── Mention ──
export const xMention = makeSimpleBuilder('Mention')

// ── Option ──
export const xOption = makeSimpleBuilder('Option')

// ── Radio ──
export const xRadio = makeSimpleBuilder('Radio')

// ── RadioGroup ──
const RadioGroupBuilder = makeBuilder('RadioGroup')
class RadioGroupBuilderExt extends RadioGroupBuilder {
  options(opts: Array<{ value: string; label: string }>): this {
    this.node.children = opts.map((o) => ({
      component: 'Radio',
      props: { value: o.value },
      children: o.label,
    }))
    return this
  }
}
export const xRadioGroup = (name: string) => new RadioGroupBuilderExt(name)

// ── Rate ──
export const xRate = makeSimpleBuilder('Rate')

// ── Select ──
const SelectBuilder = makeBuilder('Select')
class SelectBuilderExt extends SelectBuilder {
  options(opts: Array<{ value: unknown; label: string }>): this {
    return this.prop('options', opts)
  }
}
export const xSelect = (name: string) => new SelectBuilderExt(name)

// ── Slider ──
export const xSlider = makeSimpleBuilder('Slider')

// ── Switch ──
export const xSwitch = makeSimpleBuilder('Switch')

// ── Textarea ──（复用 InputBuilder 的 props，type=textarea 模拟多行）
class TextareaBuilderExt extends InputBuilder {
  rows(n: number): this {
    return this.prop('type', 'textarea').prop('rows', n)
  }
}
export const xTextarea = (name: string) => new TextareaBuilderExt(name)

// ── TimePicker ──
const TimePickerBuilder = makeBuilder('TimePicker')
class TimePickerBuilderExt extends TimePickerBuilder {
  format(v: string): this {
    return this.prop('format', v)
  }
  valueFormat(v: string): this {
    return this.prop('valueFormat', v)
  }
  range(): this {
    return this.prop('isRange', true)
  }
}
export const xTimePicker = (name: string) => new TimePickerBuilderExt(name)

// ── TimeSelect ──
const TimeSelectBuilder = makeBuilder('TimeSelect')
class TimeSelectBuilderExt extends TimeSelectBuilder {
  format(v: string): this {
    return this.prop('format', v)
  }
  start(v: string): this {
    return this.prop('start', v)
  }
  end(v: string): this {
    return this.prop('end', v)
  }
  step(v: string): this {
    return this.prop('step', v)
  }
}
export const xTimeSelect = (name: string) => new TimeSelectBuilderExt(name)

// ── Transfer ──
const TransferBuilder = makeBuilder('Transfer')
class TransferBuilderExt extends TransferBuilder {
  data(items: Array<{ key: unknown; label: string; disabled?: boolean }>): this {
    return this.prop('data', items)
  }
  titles(left: string, right: string): this {
    return this.prop('titles', [left, right] as never)
  }
  filterable(): this {
    return this.prop('filterable', true)
  }
  buttonTexts(btnLeft: string, btnRight: string): this {
    return this.prop('buttonTexts', [btnLeft, btnRight])
  }
}
export const xTransfer = (name: string) => new TransferBuilderExt(name)

// ── TreeSelect ──
const TreeSelectBuilder = makeBuilder('TreeSelect')
class TreeSelectBuilderExt extends TreeSelectBuilder {
  data(tree: Array<unknown>): this {
    return this.prop('data', tree)
  }
  multiple(): this {
    return this.prop('multiple', true)
  }
  checkStrictly(): this {
    return this.prop('checkStrictly', true)
  }
  nodeKey(k: string): this {
    return this.prop('nodeKey', k)
  }
  props(p: { children?: string; label?: string; value?: string }): this {
    return this.prop('props', p as never)
  }
}
export const xTreeSelect = (name: string) => new TreeSelectBuilderExt(name)

// ── Upload ──
const UploadBuilder = makeBuilder('Upload')
class UploadBuilderExt extends UploadBuilder {
  action(url: string): this {
    return this.prop('action', url)
  }
  accept(types: string): this {
    return this.prop('accept', types)
  }
  multiple(): this {
    return this.prop('multiple', true)
  }
  drag(): this {
    return this.prop('drag', true)
  }
  listType(t: 'text' | 'picture' | 'picture-card' | 'picture-circle'): this {
    return this.prop('listType', t)
  }
}
export const xUpload = (name: string) => new UploadBuilderExt(name)

// ────────────────────────────────────────────────────────────────────────────
// 数组节点构建器（独立于 makeBuilder，因为不绑 el 组件 props）
// 链式 API：item / initialLength / minItems / maxItems / showActions / labels / title / draggable
// build() 返回 SchemaNode —— props 类型不推导（数组节点本身不带 props）
// ────────────────────────────────────────────────────────────────────────────

export class ArrayBuilder {
  node: SchemaNode = { kind: 'array', array: { itemSchema: {} as SchemaNode } }

  constructor(name: string) {
    this.node.name = name
  }

  item(itemSchema: SchemaNode | SchemaNode[]): this {
    if (!this.node.array) this.node.array = { itemSchema }
    else this.node.array.itemSchema = itemSchema
    return this
  }

  initialLength(n: number): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.initialLength = n
    return this
  }

  minItems(n: number): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.minItems = n
    return this
  }

  maxItems(n: number): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.maxItems = n
    return this
  }

  showActions(flag: boolean | { add?: boolean; remove?: boolean; move?: boolean }): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.showActions = flag
    return this
  }

  labels(opts: { add?: string; remove?: string; moveUp?: string; moveDown?: string }): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.labels = opts
    return this
  }

  title(t: string): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.title = t
    return this
  }

  /**
   * 行拖拽排序开关 —— 与 ArrayNodeConfig.draggable 对应
   * 默认 true；开启后行可 HTML5 拖拽换位，drop 走 moveItem 更新 model
   */
  draggable(flag = true): this {
    if (!this.node.array) this.node.array = { itemSchema: {} as SchemaNode }
    this.node.array.draggable = flag
    return this
  }

  label(l: string): this {
    this.node.label = l
    return this
  }

  reaction(r: NonNullable<SchemaNode['reaction']>): this {
    this.node.reaction = r
    return this
  }

  build(): SchemaNode {
    return this.node
  }
}

export const xArray = (name: string) => new ArrayBuilder(name)

/**
 * NodeBuilder 已通过 `export class` 声明，自动成为命名导出
 * 高级用户可直接 `import { NodeBuilder } from '.../builders'` 继承自定义组件
 *
 * @example
 * class MyDatePickerBuilder extends NodeBuilder<'Input'> {
 *   dateOnly(): this { return this.prop('type', 'date') }
 * }
 */

// ────────────────────────────────────────────────────────────────────────────
// 用法示例（编译时类型校验）
// ────────────────────────────────────────────────────────────────────────────

/**
 * ```ts
 * const schema = {
 *   column: 2,
 *   row: { gutter: 24 },
 *   children: [
 *     xInput('email')
 *       .label('邮箱')
 *       .required()
 *       .placeholder('a@b.com')
 *       .defaultValue('a@b.com')
 *       .build(),
 *     //       ↑ 全部有类型推导
 *   ],
 * }
 * ```
 */
