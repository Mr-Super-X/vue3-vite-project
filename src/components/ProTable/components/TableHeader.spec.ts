/**
 * TableHeader 组件单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 点击刷新按钮触发 refresh 事件
 * 2) 点击列设置按钮触发 update:colSettingVisible
 * 3) 渲染 tableHeader 和 toolButton 插槽
 * 4) 刷新/全屏按钮同处 __actions 容器且为兄弟节点（紧贴成组布局的实现前提——
 *    __actions 样式用 `.el-button + .el-button` 合并边框，依赖 ElTooltip 的
 *    el-only-child 透传不生成 wrapper；若 element-plus 改版破坏该前提，此用例立即暴露）
 * 5) 2026-09-18：toolbar 配置渲染（ToolbarRenderer 挂载）+ tableHeader slot 作用域下发 ToolbarCtx
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import TableHeader from './TableHeader.vue'
import ToolbarRenderer from './ToolbarRenderer.vue'
import type { ToolbarCtx } from '../types'

/** 2026-09-18：toolbarCtx 为必填 prop，构造最小上下文 */
function makeCtx(overrides: Partial<ToolbarCtx> = {}): ToolbarCtx {
  return { selectedRows: [], selectedCount: 0, loading: false, refresh: vi.fn(), ...overrides }
}

function mountHeader(props: Record<string, unknown>, slots?: Record<string, string>) {
  return mount(TableHeader, {
    props: {
      columns: [],
      visibleColumns: [],
      density: 'default',
      colSettingVisible: false,
      toolbarCtx: makeCtx(),
      ...props,
    },
    ...(slots ? { slots } : {}),
  })
}

describe('TableHeader', () => {
  it('点击刷新按钮触发 refresh 事件', async () => {
    const wrapper = mountHeader({})
    await wrapper.find('[data-test="refresh-btn"]').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('点击列设置按钮触发 update:colSettingVisible', async () => {
    const wrapper = mountHeader({ columns: [{ prop: 'a', label: 'A' }] })
    await wrapper.find('[data-test="col-setting-btn"]').trigger('click')
    expect(wrapper.emitted('update:colSettingVisible')).toBeTruthy()
  })

  it('渲染 tableHeader 和 toolButton 插槽', () => {
    const wrapper = mountHeader(
      {},
      {
        tableHeader: '<div class="custom-header">MyTable</div>',
        toolButton: '<button class="custom-btn">Export</button>',
      }
    )
    expect(wrapper.find('.custom-header').exists()).toBe(true)
    expect(wrapper.find('.custom-btn').exists()).toBe(true)
  })

  it('点击密度切换按钮触发 update:density', async () => {
    const wrapper = mountHeader({})
    // 找到 "紧凑" 按钮并点击
    const compactBtn = wrapper.findAll('button').find((b) => b.text().includes('紧凑'))
    await compactBtn?.trigger('click')
    expect(wrapper.emitted('update:density')).toBeTruthy()
  })

  it('刷新/全屏按钮同属 __actions 容器且为兄弟节点（紧贴成组布局）', () => {
    const wrapper = mountHeader({ fullscreen: false })
    const refreshBtn = wrapper.find('[data-test="refresh-btn"]')
    const fullscreenBtn = wrapper.find('[data-test="fullscreen-btn"]')
    // 两按钮的父元素均为 __actions 容器（ElTooltip 经 el-only-child 透传，不生成 wrapper）
    const actionsEl = wrapper.find('.vv-pro-table-header__actions')
    expect(actionsEl.exists()).toBe(true)
    expect(refreshBtn.element.parentElement).toBe(actionsEl.element)
    expect(fullscreenBtn.element.parentElement).toBe(actionsEl.element)
    // 兄弟节点（相邻 DOM 序）——`.el-button + .el-button` 边框合并选择器成立的前提
    expect(
      refreshBtn.element.nextElementSibling === fullscreenBtn.element ||
        fullscreenBtn.element.nextElementSibling === refreshBtn.element
    ).toBe(true)
    // 列设置按钮不在 __actions 组内（组间由 __right gap 分隔）
    expect(wrapper.find('[data-test="col-setting-btn"]').element.parentElement).not.toBe(
      actionsEl.element
    )
  })

  it('2026-09-18：toolbar 配置渲染 ToolbarRenderer，slot 作用域下发 ToolbarCtx', () => {
    setActivePinia(createPinia())
    const wrapper = mountHeader(
      { toolbar: [{ label: '新增', onClick: vi.fn() }] },
      {
        tableHeader:
          '<template #tableHeader="{ selectedCount }"><i class="scope-count">{{ selectedCount }}</i></template>',
      }
    )
    expect(wrapper.findComponent(ToolbarRenderer).exists()).toBe(true)
    expect(wrapper.text()).toContain('新增')
    expect(wrapper.find('.scope-count').text()).toBe('0')
  })
})
