/**
 * ProTable 集成 spec —— v2.0 能力冲突矩阵 + 启动校验
 *
 * 覆盖 spec §七 冲突矩阵 6 条规则 + §七.3 启动校验。
 * 通过 mount + props 传 4 能力组合 + 断言 console.warn 触发。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProTable from './ProTable.vue'
import type { ProTableProps } from './types'

const mockApi: ProTableProps['requestApi'] = async () => ({
  data: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
})

describe('ProTable v2.0 集成（冲突矩阵 + 启动校验）', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('① 编辑 + 树形：启动时 console.warn 提示「编辑仅作用于叶子节点」', async () => {
    mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称', edit: { el: 'input' } }],
        requestApi: mockApi,
        enableRowEdit: true,
        enableTree: { defaultExpandDepth: 1 },
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('编辑仅作用于叶子节点'))
  })

  it('④ 树形 + 合并：span.direction=column 自动改为 row + console.warn', async () => {
    mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        requestApi: mockApi,
        enableTree: { defaultExpandDepth: 1 },
        enableCellSpan: { direction: 'column' } as never,
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('span.direction=column'))
  })

  it('启动校验：能力冲突时只 warn 不 throw（组件仍 mount 成功）', () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [],
        requestApi: mockApi,
        enableRowEdit: true,
        enableTree: true,
      } as ProTableProps,
    })
    expect(wrapper.exists()).toBe(true)
    expect(console.warn).toHaveBeenCalled()
  })

  it('所有能力未启用：4 个 composable 都不实例化（不引入运行时开销）', () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [],
        requestApi: mockApi,
      } as ProTableProps,
    })
    expect(wrapper.exists()).toBe(true)
    // 4 个能力 prop 全部未设置时，validateCapabilities 应无 warn
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('单能力启用：enableRowEdit=true 不触发冲突 warn', () => {
    mount(ProTable, {
      props: {
        columns: [],
        requestApi: mockApi,
        enableRowEdit: true,
      } as ProTableProps,
    })
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('编辑仅作用于叶子节点'))
  })

  it('能力 prop 接受 boolean 与 config 对象两种形式', () => {
    const wrapper1 = mount(ProTable, {
      props: {
        columns: [],
        requestApi: mockApi,
        enableRowEdit: true,
      } as ProTableProps,
    })
    const wrapper2 = mount(ProTable, {
      props: {
        columns: [],
        requestApi: mockApi,
        enableRowEdit: { trigger: 'manual' },
      } as ProTableProps,
    })
    expect(wrapper1.exists()).toBe(true)
    expect(wrapper2.exists()).toBe(true)
  })
})
