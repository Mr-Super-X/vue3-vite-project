/**
 * TableHeader 组件单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 点击刷新按钮触发 refresh 事件
 * 2) 点击列设置按钮触发 update:colSettingVisible
 * 3) 渲染 tableHeader 和 toolButton 插槽
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableHeader from './TableHeader.vue'

describe('TableHeader', () => {
  it('点击刷新按钮触发 refresh 事件', async () => {
    const wrapper = mount(TableHeader, {
      props: {
        columns: [],
        visibleColumns: [],
        density: 'default',
        colSettingVisible: false,
      },
    })
    await wrapper.find('[data-test="refresh-btn"]').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('点击列设置按钮触发 update:colSettingVisible', async () => {
    const wrapper = mount(TableHeader, {
      props: {
        columns: [{ prop: 'a', label: 'A' }],
        visibleColumns: [],
        density: 'default',
        colSettingVisible: false,
      },
    })
    await wrapper.find('[data-test="col-setting-btn"]').trigger('click')
    expect(wrapper.emitted('update:colSettingVisible')).toBeTruthy()
  })

  it('渲染 tableHeader 和 toolButton 插槽', () => {
    const wrapper = mount(TableHeader, {
      props: {
        columns: [],
        visibleColumns: [],
        density: 'default',
        colSettingVisible: false,
      },
      slots: {
        tableHeader: '<div class="custom-header">MyTable</div>',
        toolButton: '<button class="custom-btn">Export</button>',
      },
    })
    expect(wrapper.find('.custom-header').exists()).toBe(true)
    expect(wrapper.find('.custom-btn').exists()).toBe(true)
  })

  it('点击密度切换按钮触发 update:density', async () => {
    const wrapper = mount(TableHeader, {
      props: {
        columns: [],
        visibleColumns: [],
        density: 'default',
        colSettingVisible: false,
      },
    })
    // 找到 "紧凑" 按钮并点击
    const compactBtn = wrapper.findAll('button').find((b) => b.text().includes('紧凑'))
    await compactBtn?.trigger('click')
    expect(wrapper.emitted('update:density')).toBeTruthy()
  })
})
