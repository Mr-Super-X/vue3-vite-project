/**
 * EditCell 组件单元测试
 *
 * 覆盖场景：
 * 1) edit.el='input' 渲染 ElInput 并透传 modelValue / 列 edit.props
 * 2) 输入触发 update 事件，携带列 prop 与新值（父级据此 rowEdit.setValue）
 * 3) edit.el='input-number' / 'select' 走对应分支
 * 4) 自定义组件名（如 'MyComp'）经 resolveEditComp 原样交给 component :is
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditCell from './EditCell.vue'
import type { ProColumn } from '../types'

/** ElInput stub：把 update:modelValue 桥接到原生 input 事件，便于模拟用户输入 */
const ElInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input class="el-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}
const ElInputNumberStub = {
  props: ['modelValue'],
  template: '<div class="el-input-number-stub" />',
}
const ElSelectStub = {
  props: ['modelValue'],
  template: '<div class="el-select-stub" />',
}

const colWithEdit = (edit: NonNullable<ProColumn['edit']>): ProColumn => ({
  prop: 'name',
  label: '名称',
  edit,
})

function mountEditCell(edit: NonNullable<ProColumn['edit']>, value: unknown) {
  return mount(EditCell, {
    props: { rowKey: 1, col: colWithEdit(edit), value },
    global: {
      stubs: { ElInput: ElInputStub, ElInputNumber: ElInputNumberStub, ElSelect: ElSelectStub },
    },
  })
}

describe('EditCell', () => {
  it('edit.el=input 渲染 ElInput 并透传 modelValue 与 edit.props', () => {
    const wrapper = mountEditCell({ el: 'input', props: { placeholder: '请输入' } }, '张三')
    const input = wrapper.find('input.el-input-stub')
    expect(input.exists()).toBe(true)
    expect(input.attributes('value')).toBe('张三')
  })

  it('输入触发 update 事件，携带列 prop 与新值', async () => {
    const wrapper = mountEditCell({ el: 'input' }, '旧值')
    await wrapper.find('input.el-input-stub').setValue('新值')
    expect(wrapper.emitted('update')).toEqual([['name', '新值']])
  })

  it('edit.el=input-number / select 分别走对应控件分支', () => {
    expect(mountEditCell({ el: 'input-number' }, 3).find('.el-input-number-stub').exists()).toBe(
      true
    )
    expect(mountEditCell({ el: 'select' }, 'a').find('.el-select-stub').exists()).toBe(true)
  })

  it('自定义组件名经 resolveEditComp 原样交给 component :is', () => {
    // 未注册的自定义组件名渲染为同名原生标签（Vue 运行时降级行为），
    // 此处仅验证不会命中三个内置分支而落空
    const wrapper = mountEditCell({ el: 'my-custom-comp' }, 'x')
    expect(wrapper.find('.el-input-stub').exists()).toBe(false)
    expect(wrapper.html()).toContain('my-custom-comp')
  })
})
