/**
 * ProTable 集成 spec —— v2.0 能力冲突矩阵 + 启动校验
 *
 * 覆盖 spec §七 冲突矩阵 6 条规则 + §七.3 启动校验。
 * 通过 mount + props 传 4 能力组合 + 断言 console.warn 触发。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProTable from './ProTable.vue'
import VxeTableBody from './components/VxeTableBody.vue'
import type { ProTableProps } from './types'

// v2.1 P3：VxeTableBody 的 vxe 动态加载在集成测试中 mock 为「永不 resolve」——
// 保持骨架屏态即可断言分支接管，避免真实 import vxe-table（大文件 + jsdom 渲染不确定性）。
// 真实加载 / fallback 路径的用例由 P5 引擎切换测试覆盖
vi.mock('./composables/useVxeTable', () => ({
  useVxeTable: () => ({
    loadVxeTable: () => new Promise<unknown>(() => {}),
    isLoaded: () => false,
    reset: () => {},
  }),
}))

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

  it('vxe-table 引擎：setup 不再回退，VxeTableBody 分支接管（v2.1 P3）', async () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        // 返回非空数据：空数据时 AsyncState 渲染 empty 态不挂载表格体，无法断言引擎分支
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
        tableEngine: 'vxe-table',
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    // v2.1 P3：resolveEngine 的静态回退已删除（运行时回退由 VxeTableBody engine-fallback 承担）
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('vxe-table 引擎暂未实现'))
    // vxe 加载被 mock 为永不完成：分支由 VxeTableBody（骨架屏态）接管，不挂载 ElTable
    expect(wrapper.findComponent(VxeTableBody).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ElTable' }).exists()).toBe(false)
  })

  it('vxe 引擎 + enableTree：warn「暂不支持树形」且忽略（v2.1 决策 5）', async () => {
    mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
        tableEngine: 'vxe-table',
        enableTree: { defaultExpandDepth: 1 },
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('vxe-table 引擎暂不支持树形'))
  })

  it('vxe 引擎 + enableRowDrag：warn「暂不支持行拖拽」且忽略（v2.1 决策 5）', async () => {
    mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
        tableEngine: 'vxe-table',
        enableRowDrag: true,
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('vxe-table 引擎暂不支持行拖拽')
    )
  })

  it('vxe 引擎 + 编辑 + 树形：不 warn「编辑仅作用于叶子节点」（树形前提已被忽略，避免误导）', async () => {
    mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称', edit: { el: 'input' } }],
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
        tableEngine: 'vxe-table',
        enableRowEdit: true,
        enableTree: { defaultExpandDepth: 1 },
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('编辑仅作用于叶子节点'))
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
        enableRowEdit: { onSaved: () => {} },
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

  it('v2.2-M1：element expose 指向 ElTable 实例（element-plus 引擎下非 null）', async () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        // 返回非空数据：空数据时 AsyncState 渲染 empty 态不挂载表格体
        requestApi: async () => ({ data: [{ name: '甲' }], total: 1, pageNum: 1, pageSize: 10 }),
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    const vm = wrapper.vm as unknown as { element: { clearSelection?: unknown } | null }
    expect(vm.element).not.toBeNull()
    // 断言穿透到 ElTable 实例方法：若 expose 链任何一环把 ref 对象原样透出，
    // element 会是 { value: ... } 包装而非实例，本断言即失败（审查发现 #1 的实证裁决）
    expect(typeof vm.element?.clearSelection).toBe('function')
  })

  it('v2.2-M1 修复回归：selection 列行内渲染 el-table 内置 checkbox（default slot 不覆盖 cellForced）', async () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [
          { prop: '__selection', label: '', type: 'selection', width: 50 },
          { prop: 'name', label: '名称' },
        ],
        // 返回非空数据：空数据时 AsyncState 渲染 empty 态不挂载表格体
        requestApi: async () => ({
          data: [{ id: 1, name: '甲' }],
          total: 1,
          pageNum: 1,
          pageSize: 10,
        }),
        rowKey: 'id',
      } as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10))
    // 缺陷现象：ElTableColumn 统一提供 default slot 会覆盖 el-table 对 selection 列的
    // 强制 checkbox 渲染（cellForced.renderCell），导致行内勾选框缺失、只有表头全选框
    expect(wrapper.findAll('.el-table__body .el-checkbox').length).toBe(1)
  })

  it('v2.2-M1：跨页 reset 只触发一次请求（page≠1 时无双发）', async () => {
    const requestApi = vi.fn().mockResolvedValue({ data: [], total: 100, pageNum: 1, pageSize: 10 })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称', search: { el: 'input' } }],
        requestApi,
      } as unknown as ProTableProps,
    })
    await new Promise((r) => setTimeout(r, 10)) // onMounted 首次请求
    expect(requestApi).toHaveBeenCalledTimes(1)

    // 翻到第 3 页（watch 触发第 2 次请求）
    wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 3)
    await vi.waitFor(() => expect(requestApi).toHaveBeenCalledTimes(2))

    // 重置：page 3→1 由 watch 触发一次请求即够，不得再手动 refresh 第二次
    const vm = wrapper.vm as unknown as { reset: () => Promise<void> }
    await vm.reset()
    await new Promise((r) => setTimeout(r, 20))
    expect(requestApi).toHaveBeenCalledTimes(3)
  })

  it('v2.2-M1 补偿：切分页期间表格展示 loading 遮罩（initialLoading skeleton 仅首次）', async () => {
    type MockResponse = {
      data: { name: string }[]
      total: number
      pageNum: number
      pageSize: number
    }
    let resolveSecond: ((v: MockResponse) => void) | null = null
    let callCount = 0
    const requestApi = vi.fn().mockImplementation(() => {
      callCount += 1
      // 首次请求直接成功；第二次请求（切分页）人为挂起，用于断言 loading 遮罩
      return callCount === 1
        ? Promise.resolve<MockResponse>({
            data: [{ name: '甲' }],
            total: 100,
            pageNum: 1,
            pageSize: 10,
          })
        : new Promise<MockResponse>((resolve) => {
            resolveSecond = resolve
          })
    })
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        requestApi,
      } as unknown as ProTableProps,
    })
    // 首次请求完成 → 表格挂载（非空数据），此时不应有表格遮罩（skeleton 也已结束）
    await vi.waitFor(() => expect(requestApi).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 10))
    expect(wrapper.find('.el-loading-mask').exists()).toBe(false)

    // 切到第 2 页：第二次请求挂起期间，v-loading 遮罩应出现在表格上
    wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)
    await vi.waitFor(() => expect(wrapper.find('.el-loading-mask').exists()).toBe(true))

    // 释放第二次请求 → 数据到达后遮罩消失
    resolveSecond?.({ data: [{ name: '乙' }], total: 100, pageNum: 2, pageSize: 10 })
    await vi.waitFor(() => expect(wrapper.find('.el-loading-mask').exists()).toBe(false))
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
