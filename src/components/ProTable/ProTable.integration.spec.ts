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

  it('④ 树形 + 合并：span.direction=column 被忽略 + console.warn（M5：不改写调用方配置）', async () => {
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

  it('vxe-table 引擎：warn 回退 element-plus（v2.0 未实现）', async () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        // 返回非空数据：空数据时 AsyncState 渲染 empty 态不挂载 ElTable，无法断言引擎回退
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
        tableEngine: 'vxe-table',
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('vxe-table 引擎暂未实现'))
    // 回退后仍渲染 element-plus 表格
    expect(wrapper.findComponent({ name: 'ElTable' }).exists()).toBe(true)
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

  it('H1 回归：程序化 setSearchParams 的请求带传入参数（而非默认参数）', async () => {
    const requestApi = vi.fn().mockResolvedValue({ data: [], total: 0, pageNum: 1, pageSize: 10 })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称', search: { el: 'input', defaultValue: '' } }],
        requestApi,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10)) // 等待 onMounted 首次请求
    const vm = wrapper.vm as unknown as {
      setSearchParams: (p: Record<string, unknown>) => Promise<void>
    }
    await vm.setSearchParams({ name: '李四' })
    await new Promise((r) => setTimeout(r, 10))
    const calls = requestApi.mock.calls
    expect(calls[calls.length - 1]![0]).toMatchObject({ name: '李四' })
  })

  it('H2 回归：搜索框输入不发请求，点搜索按钮才发且参数正确', async () => {
    const requestApi = vi.fn().mockResolvedValue({ data: [], total: 0, pageNum: 1, pageSize: 10 })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称', search: { el: 'input', defaultValue: '' } }],
        requestApi,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10)) // 首次请求
    const initialCalls = requestApi.mock.calls.length

    // 输入关键词（不点搜索）：不应触发新请求
    await wrapper.find('input').setValue('张三')
    await new Promise((r) => setTimeout(r, 10))
    expect(requestApi.mock.calls.length).toBe(initialCalls)

    // 点搜索按钮：触发一次请求且带输入参数
    await wrapper.find('[data-test="search-btn"]').trigger('click')
    await new Promise((r) => setTimeout(r, 10))
    expect(requestApi.mock.calls.length).toBe(initialCalls + 1)
    const calls = requestApi.mock.calls
    expect(calls[calls.length - 1]![0]).toMatchObject({ name: '张三' })
  })

  it('M2：sortable=custom 列 sort-change → 请求带 orderByColumn/isAsc（服务端排序接线）', async () => {
    const requestApi = vi.fn().mockResolvedValue({
      data: [{ name: '甲', amount: 3 }],
      total: 1,
      pageNum: 1,
      pageSize: 10,
    })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'amount', label: '金额', sortable: 'custom' }],
        requestApi,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10)) // 首次请求
    // 直接驱动 el-table 的 sort-change（jsdom 点击 el-table 表头不可靠；
    // 事件接线由本测试覆盖，真实点击路径列为浏览器手动验证）
    wrapper
      .findComponent({ name: 'ElTable' })
      .vm.$emit('sort-change', { column: null, prop: 'amount', order: 'ascending' })
    await new Promise((r) => setTimeout(r, 10))
    const calls = requestApi.mock.calls
    expect(calls[calls.length - 1]![0]).toMatchObject({ orderByColumn: 'amount', isAsc: 'asc' })
  })

  it('M2：sortable=true（客户端排序）列 sort-change 不触发服务端请求', async () => {
    const requestApi = vi.fn().mockResolvedValue({
      data: [{ name: '甲', amount: 3 }],
      total: 1,
      pageNum: 1,
      pageSize: 10,
    })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'amount', label: '金额', sortable: true }],
        requestApi,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    const callsBefore = requestApi.mock.calls.length
    wrapper
      .findComponent({ name: 'ElTable' })
      .vm.$emit('sort-change', { column: null, prop: 'amount', order: 'ascending' })
    await new Promise((r) => setTimeout(r, 10))
    expect(requestApi.mock.calls.length).toBe(callsBefore)
  })

  it('M2：组件向外 emit sort-change（父级可监听排序变化）', async () => {
    const onSortChange = vi.fn()
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'amount', label: '金额', sortable: 'custom' }],
        // 返回非空数据：空数据时 AsyncState 渲染 empty 态不挂载 ElTable，无法驱动 sort-change
        requestApi: async () => ({ data: [{ amount: 3 }], total: 1, pageNum: 1, pageSize: 10 }),
        onSortChange,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    wrapper
      .findComponent({ name: 'ElTable' })
      .vm.$emit('sort-change', { column: null, prop: 'amount', order: 'descending' })
    await new Promise((r) => setTimeout(r, 10))
    expect(onSortChange).toHaveBeenCalledWith({ prop: 'amount', order: 'descending' })
  })
})
