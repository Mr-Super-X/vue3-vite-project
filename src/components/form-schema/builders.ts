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
import type { SchemaNode, SchemaNodeFor, ComponentName, PropsByComponent, RuleItem } from './types'

/** 链式构建器基类（泛型：绑死 component 名 + props 类型） */
class NodeBuilder<C extends ComponentName, P = PropsByComponent[C]> {
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
): new (name: string) => NodeBuilder<C, PropsByComponent[C]> & { [k: string]: unknown } {
  // 返回一个类，构造时设置 component 字段
  return class {
    private _b: NodeBuilder<C, PropsByComponent[C]>
    constructor(name: string) {
      this._b = new NodeBuilder<C, PropsByComponent[C]>(name)
      ;(this._b.node as { component?: C }).component = componentName
    }
    label(l: string) {
      return this._b.label(l)
    }
    defaultValue(v: unknown) {
      return this._b.defaultValue(v as never)
    }
    placeholder(p: string) {
      return this._b.placeholder(p)
    }
    prop(k: string, v: unknown) {
      return this._b.prop(k, v)
    }
    required(m?: string) {
      return this._b.required(m)
    }
    rules(r: RuleItem[] | string) {
      return this._b.rules(r)
    }
    hidden(f?: boolean) {
      return this._b.hidden(f)
    }
    ignore(f?: boolean) {
      return this._b.ignore(f)
    }
    col(s: number) {
      return this._b.col(s)
    }
    reaction(r: NonNullable<SchemaNode['reaction']>) {
      return this._b.reaction(r)
    }
    build() {
      return this._b.build()
    }
  } as unknown as new (
    name: string
  ) => NodeBuilder<C, PropsByComponent[C]> & { [k: string]: unknown }
}

/** 18 个 component 类型的 builder 类（每个绑死 component 名） */
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
export const xTimePicker = (name: string) => new TimePickerBuilder(name)
export const xTimeSelect = (name: string) => new TimeSelectBuilder(name)
export const xTreeSelect = (name: string) => new TreeSelectBuilder(name)
export const xUpload = (name: string) => new UploadBuilder(name)
export const xAutocomplete = (name: string) => new AutocompleteBuilder(name)
export const xTransfer = (name: string) => new TransferBuilder(name)
export const xTextarea = (name: string) => new TextareaBuilderExt(name)
export const xRadioGroup = (name: string) => new RadioGroupBuilderExt(name)
export const xRadio = (name: string) => new RadioBuilder(name)
export const xCheckboxGroup = (name: string) => new CheckboxGroupBuilder(name)
export const xCheckbox = (name: string) => new CheckboxBuilder(name)
export const xCascader = (name: string) => new CascaderBuilder(name)
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
