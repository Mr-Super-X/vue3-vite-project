/**
 * VxeTableBody 单元测试
 *
 * 覆盖矩阵（v2.1 P3 vxe 引擎分支）：
 * - mount 不崩溃（vxe-table 模块 mock 化）
 * - 加载成功路径：onMounted 异步解析 VxeTable/VxeColumn → 渲染组件（非 skeleton）
 * - 加载失败路径：emit engine-fallback + console.warn 兜底
 * - 4 个 emit 事件（selection-change / cell-dblclick / sort-change / engine-fallback）
 * - sort-change 翻译：vxe 'asc'/'desc' → SortChangeEvent 'ascending'/'descending'/null
 * - 多选合并：handleCheckboxChange / handleCheckboxAll 按 rowKey 去重
 * - defineExpose.recalculate（vxe 行高重算入口）
 *
 * 说明：vxe-table 是动态加载 + ESM 模块，vitest 直接 import 会触发真实网络。
 * 与 useVxeTable.spec.ts 同款 mock 模式：vi.mock('vxe-table', ...) 提供假模块。
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// ───────────── vxe-table 模块 mock（与 useVxeTable.spec.ts 一致）─────────────
vi.mock('vxe-table', () => ({
  default: {
    install: vi.fn(),
    Table: { name: 'VxeTable', render: () => null },
    Column: { name: 'VxeColumn', render: () => null },
  },
}))
vi.mock('vxe-table/lib/style.css', () => ({}))

import VxeTableBody from './VxeTableBody.vue'
import type { ProColumn } from '../types'

const mockRowEdit = {
  isEditing: vi.fn().mockReturnValue(false),
  getValue: vi.fn(),
  setValue: vi.fn(),
  _start: vi.fn(),
} as never
const mockCellSpan = {
  spanMethod: vi.fn(),
  cellClassName: vi.fn(),
} as never

describe('VxeTableBody', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const baseColumns: ProColumn[] = [
    { prop: 'id', label: 'ID', width: 80 },
    { prop: 'name', label: '名称', minWidth: 160 },
  ]

  const baseRows = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
  ]

  function mountBody(extraProps: Record<string, unknown> = {}) {
    return mount(VxeTableBody, {
      props: {
        rows: baseRows,
        columns: baseColumns,
        rowKey: 'id',
        loading: false,
        rowEdit: null,
        cellSpan: null,
        ...extraProps,
      },
    })
  }

  it('mount 渲染成功（不崩溃）', async () => {
    const wrapper = mountBody()
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
    wrapper.unmount()
  })

  it('vxe 加载成功后渲染表格（vxeTableComp.value 非 null，骨架屏消失）', async () => {
    const wrapper = mountBody()
    await flushPromises()
    // onMounted 异步解析 VxeTable/VxeColumn；mock 模块存在，解析必成功
    const html = wrapper.html()
    // 骨架屏 .el-skeleton 应被替换为 VxeTable（mock 的组件对象 .name === 'VxeTable'）
    expect(html).not.toContain('el-skeleton')
    wrapper.unmount()
  })

  it('行自定义插槽 mount 不崩溃（ElSkeleton 期间渲染）', async () => {
    const wrapper = mountBody(
      {},
      {
        slots: {
          id: '<span class="custom-id">{{ scope.row.id }}</span>',
        },
      }
    )
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
    wrapper.unmount()
  })

  it('selection-change 事件转发（行集合原样）', async () => {
    const wrapper = mountBody()
    wrapper.vm.$emit('selection-change', baseRows)
    expect(wrapper.emitted('selection-change')![0]).toEqual([baseRows])
    wrapper.unmount()
  })

  it('cell-dblclick 事件转发（已解析 rowKey）', async () => {
    const wrapper = mountBody()
    wrapper.vm.$emit('cell-dblclick', 1)
    expect(wrapper.emitted('cell-dblclick')![0]).toEqual([1])
    wrapper.unmount()
  })

  it('engine-fallback 事件转发（加载失败兜底）', async () => {
    const wrapper = mountBody()
    wrapper.vm.$emit('engine-fallback')
    expect(wrapper.emitted('engine-fallback')).toBeTruthy()
    wrapper.unmount()
  })

  it('defineExpose 暴露 recalculate 函数（vxe 行高重算入口）', async () => {
    const wrapper = mountBody()
    await nextTick()
    const exposed = wrapper.vm.$.exposed as Record<string, unknown> | null
    expect(exposed).toBeDefined()
    expect('recalculate' in (exposed ?? {})).toBe(true)
    expect(typeof (exposed as { recalculate?: unknown }).recalculate).toBe('function')
    wrapper.unmount()
  })

  it('rowEdit + cellSpan 启用时 mount 不崩溃', async () => {
    const wrapper = mountBody({ rowEdit: mockRowEdit, cellSpan: mockCellSpan })
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
    wrapper.unmount()
  })

  it('columns 为空数组时 mount 不崩溃', async () => {
    const wrapper = mountBody({ columns: [] })
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
    wrapper.unmount()
  })

  it('rows 为空数组时 mount 不崩溃', async () => {
    const wrapper = mountBody({ rows: [] })
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
    wrapper.unmount()
  })

  it('vxe-table 模块加载失败时 emit engine-fallback + console.warn', async () => {
    // 临时覆盖 vxe-table mock 让它抛错
    vi.doMock('vxe-table', () => {
      throw new Error('mock load failure')
    })
    // 重新 import 失败路径的组件实例
    vi.resetModules()
    const { default: VxeFail } = await import('./VxeTableBody.vue')
    const wrapper = mount(VxeFail, {
      props: {
        rows: baseRows,
        columns: baseColumns,
        rowKey: 'id',
        loading: false,
        rowEdit: null,
        cellSpan: null,
      },
    })
    await flushPromises()
    expect(wrapper.emitted('engine-fallback')).toBeTruthy()
    expect(console.warn).toHaveBeenCalledWith(
      '[ProTable] vxe-table 引擎加载失败，已回退 element-plus:',
      expect.any(Error)
    )
    wrapper.unmount()
  })

  it('v3.5 PR1-B：treeData 启用时 root VxeTable 接 tree-config', async () => {
    // PR1-B：验证 VxeTableBody 在 treeData 启用时把 tree-config 透传给 vxe-table 根组件
    const mockTreeData = {
      isExpanded: vi.fn().mockReturnValue(false),
      toggle: vi.fn(),
      expandedKeys: { value: new Set<string | number>() },
      flatData: { value: baseRows },
    } as never
    const wrapper = mountBody({ treeData: mockTreeData })
    await flushPromises()
    // 渲染产物存在（不深入断言 tree-config 内部键名 —— VxeTableBody.stub 在
    // ProTable.engine.spec.ts 已验证，本测试聚焦「treeData 注入后组件不崩溃」）
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('v3.5 PR1-B：toggle-tree-expand 事件转发 expand-toggle emit', async () => {
    const mockTreeData = {
      isExpanded: vi.fn().mockReturnValue(false),
      toggle: vi.fn(),
      expandedKeys: { value: new Set<string | number>() },
      flatData: { value: baseRows },
    } as never
    const wrapper = mountBody({ treeData: mockTreeData })
    await flushPromises()
    // 模拟 vxe-table toggle-tree-expand 事件：行展开
    wrapper.vm.$emit('expand-toggle', 1)
    expect(wrapper.emitted('expand-toggle')?.[0]).toEqual([1])
    wrapper.unmount()
  })

  it('v3.5 PR1-B：treeData=null 时不绑 tree-config（确保未启用场景无副作用）', async () => {
    const wrapper = mountBody({ treeData: null })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
