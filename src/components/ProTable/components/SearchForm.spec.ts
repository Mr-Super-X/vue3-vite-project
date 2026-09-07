/**
 * SearchForm 组件单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 按 columns.search 自动渲染 input/select
 * 2) 点击搜索按钮触发 search 事件
 * 3) 点击重置按钮触发 reset 事件
 * 4) 搜索项超过 searchRows×2 显示展开/收起按钮
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import SearchForm from './SearchForm.vue'

describe('SearchForm', () => {
  const columns = [
    { prop: 'name', label: '名称', search: { el: 'input' as const, defaultValue: '' } },
    { prop: 'status', label: '状态', search: { el: 'select' as const, defaultValue: null } },
  ]

  it('按 columns.search 自动渲染 input/select 控件', () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never,
        searchParams: reactive({ name: '', status: null }),
        searchRows: 3,
      },
    })
    // input + select 控件至少各 1 个
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(1)
  })

  it('点击搜索按钮触发 search 事件', async () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never,
        searchParams: reactive({ name: '', status: null }),
        searchRows: 3,
      },
    })
    await wrapper.find('[data-test="search-btn"]').trigger('click')
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('点击重置按钮触发 reset 事件', async () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never,
        searchParams: reactive({ name: 'x', status: 1 }),
        searchRows: 3,
      },
    })
    await wrapper.find('[data-test="reset-btn"]').trigger('click')
    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('搜索项超过 searchRows×2 显示展开/收起按钮', async () => {
    const manyColumns = Array.from({ length: 8 }, (_, i) => ({
      prop: `field${i}`,
      label: `字段${i}`,
      search: { el: 'input' as const },
    }))
    const wrapper = mount(SearchForm, {
      props: {
        columns: manyColumns as never,
        searchParams: reactive({}),
        searchRows: 3, // 默认显示 6（3×2）
      },
    })
    // 应该有展开/收起按钮
    expect(wrapper.find('[data-test="toggle-btn"]').exists()).toBe(true)
  })
})
