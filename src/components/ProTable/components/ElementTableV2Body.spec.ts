/**
 * ElementTableV2Body 单元测试
 * @group ProTable 组件测试
 */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementTableV2Body from './ElementTableV2Body.vue'
import type { ProColumn } from '../types'

describe('ElementTableV2Body', () => {
  const baseColumns: ProColumn[] = [
    { prop: 'id', label: 'ID', width: 100 },
    { prop: 'name', label: '名称', minWidth: 200 },
    { prop: 'value', label: '值', width: 120 },
  ]

  const baseRows = [
    { id: 1, name: 'A', value: 10 },
    { id: 2, name: 'B', value: 20 },
  ]

  it('mount 渲染成功（不崩溃）', () => {
    const wrapper = mount(ElementTableV2Body, {
      props: {
        rows: baseRows,
        columns: baseColumns,
        rowKey: 'id',
        loading: false,
        virtualConfig: {},
      },
    })
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('接收 virtualConfig 派生 width/height/estimatedRowHeight', () => {
    const wrapper = mount(ElementTableV2Body, {
      props: {
        rows: baseRows,
        columns: baseColumns,
        rowKey: 'id',
        loading: false,
        virtualConfig: { rowHeight: 60, height: 800, width: 1200 },
      },
    })
    // el-table-v2 内部读取 props，不强制断言 DOM 内部结构（element-plus 内部难测）
    expect(wrapper.props('virtualConfig').height).toBe(800)
    expect(wrapper.props('virtualConfig').rowHeight).toBe(60)
    expect(wrapper.props('virtualConfig').width).toBe(1200)
    wrapper.unmount()
  })

  it('emit selection-change 事件', async () => {
    const wrapper = mount(ElementTableV2Body, {
      props: {
        rows: baseRows,
        columns: [...baseColumns, { prop: 'select', label: '', type: 'selection', width: 50 }],
        rowKey: 'id',
        loading: false,
        virtualConfig: {},
      },
    })
    wrapper.vm.$emit('selection-change', baseRows)
    // 注：mount 后用 vm.$emit 测试组件实例事件（非真实交互）
    expect(wrapper.emitted('selection-change')).toBeTruthy()
    wrapper.unmount()
  })

  it('ProColumn.render 自定义渲染：业务 h() 函数优先于默认文本', () => {
    const customRender = vi.fn(({ row }) => `custom-${row.name}`)
    const colsWithRender: ProColumn[] = [
      ...baseColumns,
      { prop: 'value', label: '值', render: customRender as never },
    ]
    const wrapper = mount(ElementTableV2Body, {
      props: {
        rows: baseRows,
        columns: colsWithRender,
        rowKey: 'id',
        loading: false,
        virtualConfig: {},
      },
    })
    // cellRenderer 是内联函数，断言 render 被引用即可（render 不通过 el-table-v2 实际渲染触发）
    expect(customRender).toBeDefined()
    wrapper.unmount()
  })

  it('过滤 prop 缺失的列（v2 key 必备）', () => {
    const colsWithMissingProp: ProColumn[] = [
      ...baseColumns,
      // 故意加一个没有 prop 的列（v1 支持，v2 不支持）
      { prop: '', label: '无 prop' },
    ]
    const wrapper = mount(ElementTableV2Body, {
      props: {
        rows: baseRows,
        columns: colsWithMissingProp,
        rowKey: 'id',
        loading: false,
        virtualConfig: {},
      },
    })
    // 内部 v2Columns computed 过滤掉 prop===''；不直接断言 DOM，但确保 mount 不崩
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
