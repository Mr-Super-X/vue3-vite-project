/**
 * ProTable v2.1 引擎切换 spec —— vxe 分支渲染 / 加载失败回退 / vxe 事件适配
 *
 * 覆盖计划 P5：
 * - 引擎切换：tableEngine='vxe-table' 渲染 VxeTableBody 解析出的 vxe 组件（stub）
 * - fallback 路径：loadVxeTable reject → engine-fallback → 回退渲染 ElTable
 * - checkbox 合并选区：checkbox-change / checkbox-all 合并为 selection-change（决策 4）
 * - sort-change 负载适配：{ field, order } → { prop, order: 'ascending'|'descending' }（决策 4）
 *
 * mock 策略：vi.hoisted + vi.mock 按用例控制 loadVxeTable 行为（resolve stub 模块 / reject），
 * 避免真实 import vxe-table（大文件 + jsdom 渲染不确定性）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue' // vue（render 函数建 stub）
import { mount, flushPromises } from '@vue/test-utils'
import ProTable from './ProTable.vue'
import VxeTableBody from './components/VxeTableBody.vue'
import type { ProTableProps, ProColumn } from './types'

// vi.hoisted：vi.mock 工厂提升到文件顶部，可变 mock 函数须经 hoisted 透出才能按用例配置
const vxeMocks = vi.hoisted(() => ({
  loadVxeTable: vi.fn(),
}))

vi.mock('./composables/useVxeTable', () => ({
  useVxeTable: () => ({
    loadVxeTable: vxeMocks.loadVxeTable,
    isLoaded: () => false,
    reset: () => {},
  }),
}))

/** VxeTable stub：接收 VxeTableBody 模板绑定的事件（emits 声明后 $emit 才受控） */
const VxeTableStub = defineComponent({
  name: 'VxeTableStub',
  emits: ['sort-change', 'checkbox-change', 'checkbox-all', 'cell-dblclick'],
  setup(_, { slots }) {
    return () => h('div', { class: 'vxe-table-stub' }, slots.default?.())
  },
})

/** VxeColumn stub：透出 field/title 绑定值供断言；default 插槽提供 vxe 风格 scope */
const VxeColumnStub = defineComponent({
  name: 'VxeColumnStub',
  props: {
    field: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'vxe-column-stub', 'data-field': props.field }, [
        h('span', { class: 'vxe-column-stub__title' }, props.title),
        slots.default?.({ row: {}, rowIndex: 0, $columnIndex: 0 }),
      ])
  },
})

/** 解析成功时 loadVxeTable 返回的模块形状（VxeTableBody 用具名导出 VxeTable / VxeColumn） */
const stubVxeModule = { VxeTable: VxeTableStub, VxeColumn: VxeColumnStub }

const nonEmptyApi: ProTableProps['requestApi'] = async () => ({
  data: [{ id: '1', name: '甲' }],
  total: 1,
  pageNum: 1,
  pageSize: 10,
})

function makeProps(overrides: Partial<ProTableProps> = {}): ProTableProps {
  return {
    columns: [{ prop: 'name', label: '名称' }],
    requestApi: nonEmptyApi,
    ...overrides,
  } as ProTableProps
}

describe('ProTable v2.1 引擎切换', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('引擎切换：vxe-table 渲染 stub 组件 + 列映射（toVxeColumnProps 派生 field/title）', async () => {
    vxeMocks.loadVxeTable.mockResolvedValue(stubVxeModule)
    const wrapper = mount(ProTable, {
      props: makeProps({ tableEngine: 'vxe-table' }),
    })
    await flushPromises()
    await nextTick()

    const stub = wrapper.findComponent(VxeTableStub)
    expect(stub.exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ElTable' }).exists()).toBe(false)
    // 列映射：ProColumn { prop: 'name', label: '名称' } → VxeColumn { field: 'name', title: '名称' }
    const colStub = wrapper.findComponent(VxeColumnStub)
    expect(colStub.exists()).toBe(true)
    expect(colStub.props('field')).toBe('name')
    expect(colStub.props('title')).toBe('名称')
  })

  it('fallback 路径：loadVxeTable reject → warn + 回退渲染 ElTable', async () => {
    vxeMocks.loadVxeTable.mockRejectedValue(new Error('chunk load failed'))
    const wrapper = mount(ProTable, {
      props: makeProps({ tableEngine: 'vxe-table' }),
    })
    await flushPromises()
    await nextTick()

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('vxe-table 引擎加载失败'),
      expect.anything()
    )
    expect(wrapper.findComponent({ name: 'ElTable' }).exists()).toBe(true)
  })

  it('checkbox 合并选区：checkbox-change + checkbox-all 合并为 selection-change', async () => {
    vxeMocks.loadVxeTable.mockResolvedValue(stubVxeModule)
    const rows = [
      { id: '1', name: '甲' },
      { id: '2', name: '乙' },
      { id: '3', name: '丙' },
    ]
    const columns: ProColumn[] = [
      { prop: 'name', label: '名称', type: 'selection' },
      { prop: 'name', label: '名称' },
    ]
    const wrapper = mount(VxeTableBody, {
      props: { rows, columns, rowEdit: null, cellSpan: null },
    })
    await flushPromises()
    await nextTick()

    const stub = wrapper.findComponent(VxeTableStub)
    expect(stub.exists()).toBe(true)

    // 单选：勾选第 1 行 → selection-change 含 1 行
    stub.vm.$emit('checkbox-change', { row: rows[0], checked: true })
    await nextTick()
    let emitted = wrapper.emitted('selection-change')
    expect(emitted?.at(-1)?.[0]).toEqual([rows[0]])

    // 全选：勾选全部 3 行 → 合并后 3 行（单选行不重复）
    stub.vm.$emit('checkbox-all', { checked: true, rows })
    await nextTick()
    emitted = wrapper.emitted('selection-change')
    expect(emitted?.at(-1)?.[0]).toEqual(rows)

    // 单选取消：取消第 1 行 → 剩 2 行
    stub.vm.$emit('checkbox-change', { row: rows[0], checked: false })
    await nextTick()
    emitted = wrapper.emitted('selection-change')
    expect(emitted?.at(-1)?.[0]).toEqual([rows[1], rows[2]])
  })

  it('sort-change 负载适配：{ field, order: asc } → { prop, order: ascending }', async () => {
    vxeMocks.loadVxeTable.mockResolvedValue(stubVxeModule)
    const wrapper = mount(VxeTableBody, {
      props: {
        rows: [{ id: '1', name: '甲' }],
        columns: [{ prop: 'name', label: '名称' }],
        rowEdit: null,
        cellSpan: null,
      },
    })
    await flushPromises()
    await nextTick()

    const stub = wrapper.findComponent(VxeTableStub)
    stub.vm.$emit('sort-change', { field: 'amount', order: 'asc' })
    await nextTick()
    expect(wrapper.emitted('sort-change')?.at(-1)?.[0]).toEqual({
      prop: 'amount',
      order: 'ascending',
    })

    // 清除排序：order 为 null → 内部 order 归一化为 null
    stub.vm.$emit('sort-change', { field: 'amount', order: null })
    await nextTick()
    expect(wrapper.emitted('sort-change')?.at(-1)?.[0]).toEqual({ prop: 'amount', order: null })
  })
})
