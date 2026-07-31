import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SearchBar from './SearchBar.vue'

describe('SearchBar', () => {
  const types = [
    { label: '企业', value: 'company' },
    { label: '机构', value: 'org' },
  ]

  it('渲染选择器与输入框', () => {
    const w = mount(SearchBar, {
      props: { types, modelValueType: 'company', modelValueKeyword: '' },
    })
    expect(w.find('input').exists()).toBe(true)
  })

  it('空关键词时按钮 disabled', () => {
    const w = mount(SearchBar, {
      props: { types, modelValueType: 'company', modelValueKeyword: '' },
    })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('有关键词时按钮可点击', () => {
    const w = mount(SearchBar, {
      props: { types, modelValueType: 'company', modelValueKeyword: '矿山' },
    })
    expect(w.find('button').attributes('disabled')).toBeUndefined()
  })

  it('点击按钮 emit submit', async () => {
    const w = mount(SearchBar, {
      props: { types, modelValueType: 'company', modelValueKeyword: '矿山' },
    })
    await w.find('button').trigger('click')
    expect(w.emitted('submit')).toHaveLength(1)
  })
})
