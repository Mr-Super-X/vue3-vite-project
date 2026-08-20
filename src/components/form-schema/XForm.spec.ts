import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import type { SchemaNode, XFormExpose } from './types'
import XForm from './XForm.vue'

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
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input class="el-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
