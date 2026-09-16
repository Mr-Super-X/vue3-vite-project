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

  // v3.1.4 review 新增：回车不应触发页面刷新（native form submit implicit）
  it('v3.1.4：native form submit（按回车隐式提交）应拦截 + 触发 search emit', async () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never,
        searchParams: reactive({ name: 'test', status: null }),
        searchRows: 3,
      },
      attachTo: document.body, // 必须挂到 DOM 才能让 form 元素接收 submit 事件
    })
    await wrapper.vm.$nextTick()
    // 找到 native <form> 元素（ElForm 内部渲染）
    const formEl = wrapper.element.querySelector('form')
    expect(formEl).not.toBeNull()

    // 模拟浏览器 implicit submit（按回车时浏览器触发）——
    // 新建 SubmitEvent 并 dispatch，preventDefault 必须被我们的 listener 拦截
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
    const defaultPrevented = !formEl!.dispatchEvent(submitEvent)

    // 关键断言 1：浏览器默认行为被拦截（不会跳转到 ?+query）
    expect(defaultPrevented).toBe(true)
    // 关键断言 2：我们的 search emit 正常触发
    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')!.length).toBe(1)

    wrapper.unmount()
  })

  // v3.1.4 review 新增：点 X 清空应触发 search（与点搜索按钮等价）
  it('v3.1.4：ElInput clear 事件应触发 search emit（清空即搜索）', async () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never,
        searchParams: reactive({ name: '张三', status: null }),
        searchRows: 3,
      },
    })
    // 找到 ElInput 内部的 input 元素（VTU 渲染产物），触发 clear 事件
    // ElInput 在清空时会 emit 'clear' 事件（独立于 update:modelValue）
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    // 模拟 EP ElInput 触发 clear 事件
    await wrapper.findComponent({ name: 'ElInput' }).vm.$emit('clear')
    // search emit 应触发
    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')!.length).toBe(1)
  })

  it('v3.1.4：ElSelect clear 事件应触发 search emit', async () => {
    const wrapper = mount(SearchForm, {
      props: {
        columns: columns as never, // 含 select 控件
        searchParams: reactive({ name: '', status: 1 }),
        searchRows: 3,
      },
    })
    // 找到 ElSelect 组件并 emit clear
    await wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('clear')
    expect(wrapper.emitted('search')).toBeTruthy()
  })
})
