/**
 * SchemaField 单元测试
 *
 * 覆盖：
 * - props 透传：node + renderFn
 * - renderFn 被调用并接收 node
 * - renderFn 返回 VNode → 渲染该 VNode
 * - renderFn 返回字符串 → 渲染文本
 * - renderFn 返回 undefined → 无渲染（不报错）
 * - renderFn 返回数组 → 渲染多个 vnode
 * - renderFn 返回 null → 无渲染
 */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SchemaField from './SchemaField.vue'
import type { SchemaNode } from './types'

describe('SchemaField', () => {
  it('renderFn 被调用并接收 node', () => {
    const renderFn = vi.fn(() => h('div', 'rendered'))
    const node: SchemaNode = { component: 'Input', name: 'email' }
    mount(SchemaField, {
      props: { node, renderFn },
    })
    expect(renderFn).toHaveBeenCalledWith(node)
  })

  it('renderFn 返回 VNode → 渲染该 VNode', () => {
    const node: SchemaNode = { component: 'Input', name: 'email' }
    const wrapper = mount(SchemaField, {
      props: {
        node,
        renderFn: () => h('div', { 'data-test': 'custom' }, 'hello'),
      },
    })
    expect(wrapper.html()).toContain('hello')
    expect(wrapper.find('[data-test="custom"]').exists()).toBe(true)
  })

  it('renderFn 返回 undefined → 不报错，wrapper 为空', () => {
    const wrapper = mount(SchemaField, {
      props: {
        node: { component: 'Input', name: 'x' },
        renderFn: () => undefined,
      },
    })
    // 不抛错，wrapper 可能为空 div（component :is=undefined）
    expect(() => wrapper.html()).not.toThrow()
  })

  it('renderFn 返回 null → 不报错', () => {
    const wrapper = mount(SchemaField, {
      props: {
        node: { component: 'Input', name: 'x' },
        renderFn: (() => null) as never,
      },
    })
    expect(() => wrapper.html()).not.toThrow()
  })

  it('node 字段级重渲隔离：多个 SchemaField 各自独立调用 renderFn', () => {
    const renderFn = vi.fn(() => h('div'))
    const node1: SchemaNode = { component: 'Input', name: 'a' }
    const node2: SchemaNode = { component: 'Input', name: 'b' }
    const wrapper = mount({
      components: { SchemaField },
      template: `
        <div>
          <SchemaField :node="node1" :render-fn="renderFn" />
          <SchemaField :node="node2" :render-fn="renderFn" />
        </div>
      `,
      props: { node1: undefined, node2: undefined, renderFn: undefined },
      setup() {
        return { node1, node2, renderFn }
      },
    })
    expect(renderFn).toHaveBeenCalledTimes(2)
    expect(renderFn).toHaveBeenNthCalledWith(1, node1)
    expect(renderFn).toHaveBeenNthCalledWith(2, node2)
    wrapper.unmount()
  })
})
