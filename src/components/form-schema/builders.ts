/**
 * XForm schema 链式构建器：让"XForm 使用门槛低"
 *
 * 对标 FormRender 的链式 API。
 * 写 schema 像写 form-render：xInput('email').label('邮箱').required().build()
 */
import type { SchemaNode, RuleItem } from './types'

/** 链式构建器基类 */
class NodeBuilder<T extends SchemaNode> {
  protected node: Partial<T> = {}

  constructor(name: string) {
    this.node.name = name
  }

  label(label: string): this {
    this.node.label = label
    return this
  }

  defaultValue(v: unknown): this {
    ;(this.node as SchemaNode).defaultValue = v
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

  build(): T {
    return this.node as T
  }
}

class InputBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'Input'
  }
  clearable(): this {
    return this.prop('clearable', true)
  }
}

class SelectBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'Select'
  }
  options(opts: Array<{ value: unknown; label: string }>): this {
    return this.prop('options', opts) as this
  }
}

class SwitchBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'Switch'
  }
}

class DatePickerBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'DatePicker'
  }
  format(v: string): this {
    return this.prop('valueFormat', v) as this
  }
}

class TextareaBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'Input'
  }
  rows(n: number): this {
    return this.prop('type', 'textarea').prop('rows', n) as this
  }
}

class RadioGroupBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'RadioGroup'
  }
  options(opts: Array<{ value: string; label: string }>): this {
    this.node.children = opts.map((o) => ({
      component: 'Radio',
      props: { value: o.value },
      children: o.label,
    }))
    return this
  }
}

class CardBuilder extends NodeBuilder<SchemaNode> {
  constructor(name: string) {
    super(name)
    this.node.component = 'Card'
  }
  title(t: string): this {
    return this.prop('title', t)
  }
  column(c: number): this {
    ;(this.node as { column?: number }).column = c
    return this
  }
  gutter(g: number): this {
    ;(this.node as { row?: { gutter?: number } }).row = { gutter: g }
    return this
  }
}

/** 入口：链式构建 schema */
export const xInput = (name: string) => new InputBuilder(name)
export const xSelect = (name: string) => new SelectBuilder(name)
export const xSwitch = (name: string) => new SwitchBuilder(name)
export const xDatePicker = (name: string) => new DatePickerBuilder(name)
export const xTextarea = (name: string) => new TextareaBuilder(name)
export const xRadioGroup = (name: string) => new RadioGroupBuilder(name)
export const xCard = (name: string) => new CardBuilder(name)

/**
 * 用法示例：
 *
 * const schema = {
 *   column: 2,
 *   row: { gutter: 24 },
 *   children: [
 *     xInput('email').label('邮箱').required().placeholder('a@b.com').defaultValue('a@b.com').build(),
 *     xSelect('role').label('角色').options([{ value: 'admin', label: '管理员' }]).required().build(),
 *     xSwitch('enabled').label('启用').build(),
 *   ],
 * }
 */
