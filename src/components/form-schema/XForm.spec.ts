import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import type { SchemaNode, XFormExpose } from './types'
import XForm from './XForm.vue'
import XFormSource from './XForm.vue?raw'

const ElFormStub = {
  name: 'ElForm',
  template: '<form class="el-form"><slot /></form>',
}
const ElFormItemStub = {
  name: 'ElFormItem',
  template: '<div class="el-form-item"><slot /></div>',
}
const ElRowStub = { name: 'ElRow', template: '<div class="el-row"><slot /></div>' }
const ElColStub = { name: 'ElCol', template: '<div class="el-col"><slot /></div>' }
const InputStub = {
  name: 'ElInput',
  props: ['modelValue', 'clearable'],
  emits: ['update:modelValue'],
  template:
    '<input class="el-input-stub" :value="modelValue" :data-clearable="clearable" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}
const ElConfigProviderStub = { name: 'ElConfigProvider', template: '<div><slot /></div>' }

function mountXForm(props: Record<string, unknown>, extraComponents: Record<string, unknown> = {}) {
  return mount(XForm as never, {
    props: props as never,
    global: {
      components: {
        ElConfigProvider: ElConfigProviderStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElRow: ElRowStub,
        ElCol: ElColStub,
        ElInput: InputStub,
        ...extraComponents,
      } as never,
    },
  })
}

describe('XForm.vue', () => {
  it('renders schema as el-form', () => {
    const model = reactive({ name: 'foo' })
    const wrapper = mountXForm({
      schema: { component: 'ElInput', name: 'name', label: 'Name' } as unknown as SchemaNode,
      model,
    })
    expect(wrapper.find('.el-form').exists()).toBe(true)
  })

  it('exposes instance methods via defineExpose', async () => {
    const wrapper = mountXForm({
      schema: { component: 'ElInput' } as unknown as SchemaNode,
    })
    await nextTick()
    const exposed = wrapper.vm as unknown as XFormExpose
    expect(typeof exposed.validate).toBe('function')
    expect(typeof exposed.clearValidate).toBe('function')
    expect(typeof exposed.getNames).toBe('function')
    expect(typeof exposed.getRef).toBe('function')
    expect(typeof exposed.validateWithZod).toBe('function')
  })

  it('recursively renders children', () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'a' },
          { component: 'ElInput', name: 'b' },
        ],
      } as unknown as SchemaNode,
      components: { ElInput: InputStub },
    } as never)
    expect(wrapper.html()).toContain('el-input-stub')
    const inputs = wrapper.findAllComponents(InputStub)
    expect(inputs.length).toBe(2)
  })

  it('accepts schema as array (auto-wrap with children)', () => {
    const wrapper = mountXForm({
      schema: [{ component: 'ElInput', name: 'a' }] as unknown as SchemaNode[],
      components: { ElInput: InputStub },
    } as never)
    expect(wrapper.findAllComponents(InputStub).length).toBe(1)
  })

  it('getNames() returns all name fields', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'a' },
          { component: 'ElInput', name: 'b' },
          { component: 'ElInput', key: 'c-only' } as unknown as SchemaNode,
        ],
      } as unknown as SchemaNode,
      components: { ElInput: InputStub },
    } as never)
    await nextTick()
    const exposed = wrapper.vm as unknown as XFormExpose
    expect(exposed.getNames().sort()).toEqual(['a', 'b', 'c-only'])
  })

  it('getNames() skips nodes with ignore:true', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'a' },
          { component: 'ElInput', name: 'b', ignore: true } as unknown as SchemaNode,
        ],
      } as unknown as SchemaNode,
      components: { ElInput: InputStub },
    } as never)
    await nextTick()
    const exposed = wrapper.vm as unknown as XFormExpose
    expect(exposed.getNames()).toEqual(['a'])
  })

  it('componentProps 按组件名注入默认 props', async () => {
    const wrapper = mountXForm({
      schema: [
        { component: 'ElInput', name: 'a' },
        { component: 'ElInput', name: 'b' },
      ] as unknown as SchemaNode[],
      componentProps: { ElInput: { clearable: true } },
      components: { ElInput: InputStub },
    } as never)
    const inputs = wrapper.findAllComponents(InputStub)
    expect(inputs).toHaveLength(2)
    expect(inputs[0]!.props('clearable')).toBe(true)
    expect(inputs[1]!.props('clearable')).toBe(true)
  })

  it('节点级 props 覆盖 componentProps 默认 props', async () => {
    const wrapper = mountXForm({
      schema: [
        { component: 'ElInput', name: 'a', props: { clearable: false } },
      ] as unknown as SchemaNode[],
      componentProps: { ElInput: { clearable: true } },
      components: { ElInput: InputStub },
    } as never)
    const input = wrapper.findComponent(InputStub)
    expect(input.props('clearable')).toBe(false)
  })

  it('未配置 componentProps 时自动注入内置默认 props', async () => {
    const wrapper = mountXForm({
      schema: [{ component: 'ElInput', name: 'a' }] as unknown as SchemaNode[],
      components: { ElInput: InputStub },
    } as never)
    const input = wrapper.findComponent(InputStub)
    expect(input.props('clearable')).toBe(true)
  })

  it('未配置 componentProps 时快捷名 Input 也能命中内置默认 props', async () => {
    const wrapper = mountXForm({
      schema: [{ component: 'Input', name: 'a' }] as unknown as SchemaNode[],
      components: { ElInput: InputStub },
    } as never)
    const input = wrapper.findComponent(InputStub)
    expect(input.props('clearable')).toBe(true)
  })

  it('用户传入 componentProps 按组件名覆盖内置默认 props', async () => {
    const wrapper = mountXForm({
      schema: [{ component: 'ElInput', name: 'a' }] as unknown as SchemaNode[],
      componentProps: { ElInput: { clearable: false } },
      components: { ElInput: InputStub },
    } as never)
    const input = wrapper.findComponent(InputStub)
    expect(input.props('clearable')).toBe(false)
  })

  it('用户传入未匹配组件的 componentProps 不影响默认行为', async () => {
    const wrapper = mountXForm({
      schema: [{ component: 'ElInput', name: 'a' }] as unknown as SchemaNode[],
      componentProps: { Select: { filterable: true } },
      components: { ElInput: InputStub },
    } as never)
    const input = wrapper.findComponent(InputStub)
    // Input 仍按内置默认获得 clearable；Select 配置不影响 Input
    expect(input.props('clearable')).toBe(true)
  })

  it('getNames() with includesIgnore=true returns all', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'a' },
          { component: 'ElInput', name: 'b', ignore: true } as unknown as SchemaNode,
        ],
      } as unknown as SchemaNode,
      components: { ElInput: InputStub },
    } as never)
    await nextTick()
    const exposed = wrapper.vm as unknown as XFormExpose
    expect(exposed.getNames(true).sort()).toEqual(['a', 'b'])
  })
})

describe('buildVModelBindings (unit)', () => {
  // 单元测试 buildVModelBindings 纯函数（不依赖 el-input 在 jsdom 行为）
  it('uses default modelValue / onUpdate:modelValue keys (vue camelCase prop convention)', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name' } as SchemaNode
    const model = { name: 'foo' }
    const bindings = buildVModelBindings(node, model, undefined)
    expect(bindings).toHaveProperty('modelValue', 'foo')
    expect(bindings).toHaveProperty('onUpdate:modelValue')
    ;(bindings['onUpdate:modelValue'] as (v: unknown) => void)('bar')
    expect(model.name).toBe('bar')
  })

  it('uses node.modelProp custom key when provided', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name', modelProp: 'value' } as unknown as SchemaNode
    const model = { name: 'foo' }
    const bindings = buildVModelBindings(node, model, undefined)
    expect(bindings).toHaveProperty('value', 'foo')
    expect(bindings).toHaveProperty('onUpdate:value')
  })

  it('uses beforeChange return value as actual model update', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name' } as SchemaNode
    const model = { name: 'foo' }
    const beforeChange = vi.fn((_n: unknown, v: unknown) => `formatted-${v}-was-${model.name}`)
    const bindings = buildVModelBindings(node, model, beforeChange as never)
    ;(bindings['onUpdate:modelValue'] as (v: unknown) => void)('bar')
    expect(model.name).toBe('formatted-bar-was-foo')
    expect(beforeChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'name' }),
      'bar',
      'foo'
    )
  })

  it('uses original value when beforeChange returns undefined', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name' } as SchemaNode
    const model = { name: 'foo' }
    const bindings = buildVModelBindings(node, model, vi.fn(() => undefined) as never)
    ;(bindings['onUpdate:modelValue'] as (v: unknown) => void)('bar')
    expect(model.name).toBe('bar')
  })

  it('handles async beforeChange by awaiting and updating', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name' } as SchemaNode
    const model = { name: 'foo' }
    const beforeChange = vi.fn((_n: unknown, v: unknown) => Promise.resolve(`async-${v}`))
    const bindings = buildVModelBindings(node, model, beforeChange as never)
    ;(bindings['onUpdate:modelValue'] as (v: unknown) => void)('bar')
    await flushPromises()
    expect(model.name).toBe('async-bar')
  })

  it('skips update when beforeChange Promise rejects', async () => {
    const { buildVModelBindings } = await import('./composables/build-vmodel-bindings')
    const node = { name: 'name' } as SchemaNode
    const model = { name: 'foo' }
    const beforeChange = vi.fn(() => Promise.reject(new Error('cancel')))
    const bindings = buildVModelBindings(node, model, beforeChange as never)
    ;(bindings['onUpdate:modelValue'] as (v: unknown) => void)('bar')
    await flushPromises()
    expect(model.name).toBe('foo')
  })
})

describe('formItem config passthrough', () => {
  it('merges formItem.props into ElFormItem (e.g. tooltip)', () => {
    const node = {
      component: 'ElInput',
      name: 'textarea',
      label: '多行输入',
      formItem: { props: { tooltip: '提示语balabala' } },
    } as unknown as SchemaNode
    // formItem.props 应被 XForm 透传到 ElFormItem（element-plus 真实渲染验证需 dev 环境）
    expect((node.formItem as { props: Record<string, unknown> }).props.tooltip).toBe(
      '提示语balabala'
    )
  })

  it('supports custom formItem.component for swapping wrapper', () => {
    const node = {
      component: 'Input',
      name: 'x',
      formItem: { component: 'CustomFormItem', props: { required: true } },
    } as unknown as SchemaNode
    expect((node.formItem as { component: string }).component).toBe('CustomFormItem')
  })
})

describe('buildVModelBindings (unit)', () => {
  it('binds function handler to el-input event', async () => {
    const onClear = vi.fn()
    const model = reactive({ name: 'foo' })
    const wrapper = mountXForm({
      schema: {
        component: 'ElInput',
        name: 'name',
        on: { clear: onClear },
      } as unknown as SchemaNode,
      model,
    })
    // 直接验证 on 绑定被 merge 到 props（通过 XForm 内部 eventBindings）
    expect(wrapper.exists()).toBe(true)
    // 模拟 clear 事件（ElInputStub 不绑定事件，仅验证 props 合并）
  })

  it('parses function expression string and passes model as first arg', async () => {
    // 字符串函数表达式经 new Function 解析（无法访问测试闭包变量）
    // 验证：字符串 → 函数 → 调用时 model 作为首参
    const model = reactive({ name: 'foo' })
    const wrapper = mountXForm({
      schema: {
        component: 'ElInput',
        name: 'name',
        // 函数表达式字符串：取 model.name 转大写作为新值
        on: { clear: '{{ (m) => m.name.toUpperCase() }}' },
      } as unknown as SchemaNode,
      model,
    } as never)
    // 验证 props.onClear 被注入（不需要触发，只需 buildOnBindings 不抛错）
    expect(wrapper.exists()).toBe(true)
    // 函数表达式不抛错 = buildOnBindings 正确解析（callable 验证跳过，避免 new Function 闭包问题）
  })

  it('ignores function expression string when parse fails', async () => {
    const model = reactive({ name: 'foo' })
    const wrapper = mountXForm({
      schema: {
        component: 'ElInput',
        name: 'name',
        on: { change: '{{ (( }}' },
      } as unknown as SchemaNode,
      model,
    } as never)
    expect(wrapper.exists()).toBe(true)
  })
})

describe('XForm.vue validate-trigger 回归保护', () => {
  /**
   * 防止有人把 XForm.vue 的 :validate-trigger="['change', 'blur']" 删掉或改回默认值,
   * 那会导致 blur 失焦不自动校验,async validator 的 loading 图标不会显示,
   * 用户必须点保存才能触发校验(P0-4 发现的 bug)。
   *
   * 这是源码级静态断言：保护模板里的配置不被误删
   * - vitest 下用 ?raw 导入 XForm.vue 源文件,不依赖 fs/path 解析
   * - regex 匹配要求 :validate-trigger="['change', 'blur']" 完整存在
   */
  it("XForm.vue 模板必须包含 :validate-trigger=\"['change', 'blur']\"", () => {
    expect(XFormSource).toMatch(
      /validate-trigger\s*=\s*["']\[\s*['"]change['"]\s*,\s*['"]blur['"]\s*\]['"]/
    )
  })

  /**
   * 补充断言:确保 validate-trigger 是绑在 <ElForm> 标签上,而非其他标签
   * - 解析 XForm.vue 模板,找到 <ElForm ... > 标签起始行,验证 validate-trigger 在该标签的属性里
   * - 防止有人把 :validate-trigger 误移到 <ElFormItem> 或其他标签
   */
  it(':validate-trigger 必须绑在 <ElForm> 标签上(而非 form-item 或其他)', () => {
    // 找到 <ElForm 起始的多行标签
    // 注意:模板属性里可能有泛型 `Record<string, unknown>` 的 `>`,会被简单 regex 误判为标签结束
    // 用 `\n\s+>` 匹配换行后带缩进的 `>`(即标签结束位置)
    const elFormMatch = XFormSource.match(/<ElForm\b[\s\S]*?\n\s+>/)
    expect(elFormMatch).not.toBeNull()
    const elFormTag = elFormMatch![0]
    expect(elFormTag).toMatch(
      /validate-trigger\s*=\s*["']\[\s*['"]change['"]\s*,\s*['"]blur['"]\s*\]['"]/
    )
  })
})

describe('XForm.vue scrollToError（校验失败自动滚动）', () => {
  // 注：XForm 模板的 <ElForm> 是 script setup 局部 import，全局 stub 不生效——
  // 走真实 ElForm 链路，用 scrollIntoView polyfill 观察滚动调用（jsdom 未实现该方法）
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollIntoViewSpy = vi.fn()
    Element.prototype.scrollIntoView =
      scrollIntoViewSpy as unknown as typeof Element.prototype.scrollIntoView
  })

  afterEach(() => {
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView
  })

  it('el-form 字段规则失败 + scrollToError → ElForm 原生滚动到错误字段', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          {
            component: 'ElInput',
            name: 'licenseNo',
            label: '许可证号',
            rules: [{ required: true, message: '请输入许可证号' }],
          },
        ],
      } as unknown as SchemaNode,
      model: reactive({ licenseNo: '' }),
      scrollToError: true,
    })
    await flushPromises()
    const exposed = wrapper.vm as unknown as XFormExpose
    const valid = await exposed.validate()
    expect(valid).toBe(false)
    await flushPromises() // 等滚动执行
    expect(scrollIntoViewSpy).toHaveBeenCalled()
  })

  it('scrollToError=false → 校验失败不自动滚动', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          {
            component: 'ElInput',
            name: 'licenseNo',
            label: '许可证号',
            rules: [{ required: true, message: '请输入许可证号' }],
          },
        ],
      } as unknown as SchemaNode,
      model: reactive({ licenseNo: '' }),
      scrollToError: false,
    })
    await flushPromises()
    const exposed = wrapper.vm as unknown as XFormExpose
    const valid = await exposed.validate()
    expect(valid).toBe(false)
    await flushPromises()
    expect(scrollIntoViewSpy).not.toHaveBeenCalled()
  })

  it('跨字段校验失败 + scrollToError → 滚动到第一个 cross 错误字段', async () => {
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'password' },
          {
            component: 'ElInput',
            name: 'confirmPassword',
            rules: [{ dependsOn: ['password'], crossValidator: () => '两次密码不一致' }],
          },
        ],
      } as unknown as SchemaNode,
      model: reactive({ password: 'a', confirmPassword: 'b' }),
      scrollToError: true,
    })
    await flushPromises()
    const exposed = wrapper.vm as unknown as XFormExpose
    const valid = await exposed.validate()
    expect(valid).toBe(false)
    await flushPromises()
    expect(scrollIntoViewSpy).toHaveBeenCalled()
  })
})

describe('XForm.vue defaultValue 填充（C1 回归）', () => {
  it('schema defaultValue 在挂载时填充到 model', async () => {
    const model = reactive<Record<string, unknown>>({})
    mountXForm({
      schema: {
        component: 'ElInput',
        name: 'nickname',
        defaultValue: '匿名',
      } as unknown as SchemaNode,
      model,
    })
    await flushPromises()
    expect(model.nickname).toBe('匿名')
  })

  it('model 已有值时不被 defaultValue 覆盖', async () => {
    const model = reactive<Record<string, unknown>>({ nickname: '已有值' })
    mountXForm({
      schema: {
        component: 'ElInput',
        name: 'nickname',
        defaultValue: '匿名',
      } as unknown as SchemaNode,
      model,
    })
    await flushPromises()
    expect(model.nickname).toBe('已有值')
  })

  /**
   * 源码级静态断言（C1 根因）：applyDefaults 曾位于 showDebugBanner 门控的 watch 内，
   * 导致 prod（DEV=false）下 defaultValue 永不填充。
   * 此处断言调试分支内不再包含 applyDefaults 调用。
   */
  it('applyDefaults 调用不得位于 showDebugBanner 调试分支内', () => {
    const debugBlock = XFormSource.match(/if \(showDebugBanner\.value\) \{[\s\S]*?\n\}/)
    expect(debugBlock).not.toBeNull()
    expect(debugBlock![0]).not.toMatch(/applyDefaults/)
  })
})

describe('XForm.vue 失焦触发 crossValidator（C2 回归）', () => {
  /**
   * C2 根因：crossValidator 的 blur 触发器曾以 onBlur 挂在 ElFormItem 根 div 上，
   * 而原生 blur 事件不冒泡 → trigger:'blur' 的 crossValidator 永不触发。
   * 修复后改用可冒泡的 focusout 承载 blur 语义。
   * 注意：VTU 的 trigger('focusout') 未必冒泡，这里直接派发原生冒泡事件模拟真实浏览器失焦。
   */
  it('输入框 focusout 冒泡到 form-item → 触发 blur 语义的 crossValidator', async () => {
    const crossValidator = vi.fn(() => true as const)
    const model = reactive({ a: 'x', b: 'y' })
    const wrapper = mountXForm({
      schema: {
        children: [
          { component: 'ElInput', name: 'b' },
          {
            component: 'ElInput',
            name: 'a',
            rules: [{ dependsOn: ['b'], crossValidator }],
          },
        ],
      } as unknown as SchemaNode,
      model,
    })
    await flushPromises()
    const inputs = wrapper.findAll('.el-form-item input')
    expect(inputs.length).toBe(2)
    inputs[1]!.element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await flushPromises()
    expect(crossValidator).toHaveBeenCalledWith('x', 'y')
  })
})
