/**
 * XForm schema 链式构建器：fbuilder
 * 让"XForm 使用门槛低"
 *
 * 对标 FormRender 的链式 API：xInput('email').label('邮箱').required().build()
 *
 * 类型推导：每个 builder 绑死 component 名称 + props 类型
 * - xInput()    → Builder<'Input', ElInputProps> → build() 返回 SchemaNodeFor<'Input'>
 * - xSelect()   → Builder<'Select', ElSelectProps>
 * - xDatePicker() → Builder<'DatePicker', ElDatePickerProps>
 * - ... 12 个
 *
 * 这样 IDE 在链式调用时自动补全 props 字段名 + 校验 props 值类型
 */
import type {
  SchemaNode,
  SchemaNodeFor,
  ComponentName,
  ComponentPropsRegistry,
  RuleItem,
  ReactionValue,
} from './types'

/** 链式构建器基类（泛型：绑死 component 名 + props 类型） */
class NodeBuilder<C extends ComponentName, P = ComponentPropsRegistry[C]> {
  // public 供 Ext 子类（如 CardBuilderExt）跨类访问子节点字段
  node: Partial<SchemaNodeFor<C>> = {}

  constructor(name: string) {
    ;(this.node as { name?: string }).name = name
  }

  label(label: string): this {
    ;(this.node as { label?: string }).label = label
    return this
  }

  defaultValue(v: P extends { defaultValue?: infer D } ? D : unknown): this {
    ;(this.node as { defaultValue?: unknown }).defaultValue = v
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
    ;(this.node as { disabled?: ReactionValue<boolean> }).disabled = v
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
    else if (typeof n.rules === 'string') n.rules = [{ required: true, message, trigger: 'blur' }]
    else n.rules = [{ required: true, message, trigger: 'blur' }]
    return this
  }

  rules(rules: RuleItem[] | string): this {
    ;(this.node as { rules?: RuleItem[] | string }).rules = rules
    return this
  }

  hidden(flag = true): this {
    ;(this.node as { hidden?: boolean }).hidden = flag
    return this
  }

  ignore(flag = true): this {
    ;(this.node as { ignore?: boolean }).ignore = flag
    return this
  }

  col(span: number): this {
    ;(this.node as { col?: boolean | { span: number } }).col = { span }
    return this
  }

  reaction(r: NonNullable<SchemaNode['reaction']>): this {
    ;(this.node as { reaction?: SchemaNode['reaction'] }).reaction = r
    return this
  }

  build(): SchemaNodeFor<C> {
    return this.node as SchemaNodeFor<C>
  }
}

/** 通用 builder 工厂：绑死 component 名 */
function makeBuilder<C extends ComponentName>(
  componentName: C
): new (name: string) => NodeBuilder<C, ComponentPropsRegistry[C]> & { [k: string]: unknown } {
  // 返回一个类，构造时设置 component 字段
  return class {
    private _b: NodeBuilder<C, ComponentPropsRegistry[C]>
    constructor(name: string) {
      this._b = new NodeBuilder<C, ComponentPropsRegistry[C]>(name)
      ;(this._b.node as { component?: C }).component = componentName
    }
    // 关键:所有基础方法返回 `this`(makeBuilder 匿名 class 实例)而非 `this._b.xxx()` 的结果
    // 否则链式调用 `.label().format()` 时 .format 在 _b(NodeBuilder) 实例上找不到
    // makeBuilder 匿名 class 是 Ext 子类(如 TimePickerBuilderExt)的父类,
    // 通过原型链 Ext 实例有 format 等方法,链式调用 .format() 才能正常
    label(l: string): this {
      this._b.label(l)
      return this
    }
    defaultValue(v: unknown): this {
      this._b.defaultValue(v as never)
      return this
    }
    placeholder(p: string): this {
      this._b.placeholder(p)
      return this
    }
    prop(k: string, v: unknown): this {
      this._b.prop(k, v)
      return this
    }
    disabled(v: ReactionValue<boolean>): this {
      this._b.disabled(v)
      return this
    }
    validator(
      fn: (rule: unknown, value: unknown, cb: (err?: Error) => void) => void,
      trigger: 'blur' | 'change' = 'blur'
    ): this {
      this._b.validator(fn, trigger)
      return this
    }
    asyncValidator(
      fn: (rule: unknown, value: unknown, cb: (err?: Error) => void) => Promise<unknown>,
      trigger: 'blur' | 'change' = 'blur'
    ): this {
      this._b.asyncValidator(fn, trigger)
      return this
    }
    required(m?: string): this {
      this._b.required(m)
      return this
    }
    rules(r: RuleItem[] | string): this {
      this._b.rules(r)
      return this
    }
    hidden(f?: boolean): this {
      this._b.hidden(f)
      return this
    }
    ignore(f?: boolean): this {
      this._b.ignore(f)
      return this
    }
    col(s: number): this {
      this._b.col(s)
      return this
    }
    reaction(r: NonNullable<SchemaNode['reaction']>): this {
      this._b.reaction(r)
      return this
    }
    build() {
      return this._b.build()
    }
  } as unknown as new (
    name: string
  ) => NodeBuilder<C, ComponentPropsRegistry[C]> & { [k: string]: unknown }
}

/** 19 个 component 类型的基础 builder 类（每个绑死 component 名；另有 Ext 扩展类与 ArrayBuilder） */
const InputBuilder = makeBuilder('Input')
const SelectBuilder = makeBuilder('Select')
const OptionBuilder = makeBuilder('Option')
const SwitchBuilder = makeBuilder('Switch')
const DatePickerBuilder = makeBuilder('DatePicker')
const TimePickerBuilder = makeBuilder('TimePicker')
const TimeSelectBuilder = makeBuilder('TimeSelect')
const TreeSelectBuilder = makeBuilder('TreeSelect')
const UploadBuilder = makeBuilder('Upload')
const AutocompleteBuilder = makeBuilder('Autocomplete')
const TransferBuilder = makeBuilder('Transfer')
const RadioGroupBuilder = makeBuilder('RadioGroup')
const RadioBuilder = makeBuilder('Radio')
const CheckboxGroupBuilder = makeBuilder('CheckboxGroup')
const CheckboxBuilder = makeBuilder('Checkbox')
const CascaderBuilder = makeBuilder('Cascader')
const InputNumberBuilder = makeBuilder('InputNumber')
const SliderBuilder = makeBuilder('Slider')
const CardBuilder = makeBuilder('Card')

/** InputBuilder 扩展 clearable（el-input 特有） */
class InputBuilderExt extends InputBuilder {
  clearable(): this {
    return this.prop('clearable', true)
  }
}

/** SelectBuilder 扩展 options（el-select 特有） */
class SelectBuilderExt extends SelectBuilder {
  options(opts: Array<{ value: unknown; label: string }>): this {
    return this.prop('options', opts)
  }
}

/** SwitchBuilder 扩展（无特有方法） */
class SwitchBuilderExt extends SwitchBuilder {}

/** DatePickerBuilder 扩展 format（el-date-picker 特有） */
class DatePickerBuilderExt extends DatePickerBuilder {
  format(v: string): this {
    return this.prop('valueFormat', v)
  }
}

/** TextareaBuilder 扩展 rows（用 Input type=textarea 模拟） */
class TextareaBuilderExt extends InputBuilder {
  rows(n: number): this {
    return this.prop('type', 'textarea').prop('rows', n)
  }
}

/** RadioGroupBuilder 扩展 options（多个 Radio 子节点） */
class RadioGroupBuilderExt extends RadioGroupBuilder {
  options(opts: Array<{ value: string; label: string }>): this {
    const n = (this as unknown as { _b: InstanceType<typeof RadioGroupBuilder> })._b
    ;(n.node as { children?: unknown }).children = opts.map((o) => ({
      component: 'Radio',
      props: { value: o.value },
      children: o.label,
    }))
    return this
  }
}

/** CardBuilder 扩展 title / column / gutter */
class CardBuilderExt extends CardBuilder {
  title(t: string): this {
    return this.prop('title', t)
  }
  column(c: number): this {
    const b = (this as unknown as { _b: InstanceType<typeof CardBuilder> })._b
    ;(b.node as { column?: number }).column = c
    return this
  }
  gutter(g: number): this {
    const b = (this as unknown as { _b: InstanceType<typeof CardBuilder> })._b
    ;(b.node as { row?: { gutter?: number } }).row = { gutter: g }
    return this
  }
}

/** TimePickerBuilder 扩展 format / valueFormat / range(el-time-picker 特有) */
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

/** TimeSelectBuilder 扩展 format / start / end / step(el-time-select 特有) */
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

/** UploadBuilder 扩展 action / accept / multiple / drag(el-upload 特有) */
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

/** TransferBuilder 扩展 data / titles / filterable / targetKeys(el-transfer 特有) */
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
    return this.prop('button-texts', [btnLeft, btnRight] as never)
  }
}

/** TreeSelectBuilder 扩展 data / multiple / checkStrictly / nodeKey(el-tree-select 特有) */
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

/** CascaderBuilder 扩展 options / props / showAllLevels / separator(el-cascader 特有) */
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

/** AutocompleteBuilder 扩展 fetchSuggestions / triggerOnFocus / placement(el-autocomplete 特有) */
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

/**
 * 数组节点构建器（独立于 makeBuilder,因为不绑 el 组件 props）
 * 链式 API：item / initialLength / minItems / maxItems / showActions / labels / title
 * build() 返回 SchemaNode —— props 类型不推导(数组节点本身不带 props)
 */
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

/** 入口：链式构建 schema（返回类型带 props 推导） */
export const xInput = (name: string) => new InputBuilderExt(name)
export const xSelect = (name: string) => new SelectBuilderExt(name)
export const xOption = (name: string) => new OptionBuilder(name)
export const xSwitch = (name: string) => new SwitchBuilderExt(name)
export const xDatePicker = (name: string) => new DatePickerBuilderExt(name)
export const xTimePicker = (name: string) => new TimePickerBuilderExt(name)
export const xTimeSelect = (name: string) => new TimeSelectBuilderExt(name)
export const xTreeSelect = (name: string) => new TreeSelectBuilderExt(name)
export const xUpload = (name: string) => new UploadBuilderExt(name)
export const xAutocomplete = (name: string) => new AutocompleteBuilderExt(name)
export const xTransfer = (name: string) => new TransferBuilderExt(name)
export const xTextarea = (name: string) => new TextareaBuilderExt(name)
export const xRadioGroup = (name: string) => new RadioGroupBuilderExt(name)
export const xRadio = (name: string) => new RadioBuilder(name)
export const xCheckboxGroup = (name: string) => new CheckboxGroupBuilder(name)
export const xCheckbox = (name: string) => new CheckboxBuilder(name)
export const xCascader = (name: string) => new CascaderBuilderExt(name)
export const xInputNumber = (name: string) => new InputNumberBuilder(name)
export const xSlider = (name: string) => new SliderBuilder(name)
export const xCard = (name: string) => new CardBuilderExt(name)
export const xArray = (name: string) => new ArrayBuilder(name)

/**
 * 用法示例（编译时类型校验）：
 *
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
 */
