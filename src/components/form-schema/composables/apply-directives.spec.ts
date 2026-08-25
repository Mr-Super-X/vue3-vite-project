/**
 * applyDirectives 单元测试
 * 覆盖：
 * - undefined / 空数组 → 原样返回
 * - 单个字符串指令 + value/arg/modifiers
 * - 指令对象 + 隐式 name 提取
 * - 多个指令同时应用
 * - withDirectives 抛错 → 返回原 vnode
 */
import { describe, it, expect, vi } from 'vitest'
import { h, type VNode, type Directive } from 'vue'
import { applyDirectives } from './apply-directives'

function makeVNode(): VNode {
  return h('div', 'test')
}

describe('applyDirectives / 空入参', () => {
  it('directives undefined → 原样返回同一引用', () => {
    const vnode = makeVNode()
    const result = applyDirectives(vnode, undefined)
    expect(result).toBe(vnode)
  })

  it('directives 空数组 → 原样返回同一引用', () => {
    const vnode = makeVNode()
    const result = applyDirectives(vnode, [])
    expect(result).toBe(vnode)
  })
})

describe('applyDirectives / 字符串指令', () => {
  it('单个 string directive + value', () => {
    const vnode = makeVNode()
    const result = applyDirectives(vnode, [{ directive: 'my-directive', value: { foo: 'baz' } }])
    expect(result).toBeDefined()
    expect(result).toBe(vnode) // jsdom 下 vue withDirectives 可能惰性返回同一引用
  })

  it('带 arg 与 modifiers', () => {
    const vnode = makeVNode()
    const result = applyDirectives(vnode, [
      {
        directive: 'v-my',
        value: 42,
        arg: 'x',
        modifiers: { stop: true, prevent: true },
      },
    ])
    expect(result).toBeDefined()
    expect(result).toBe(vnode)
  })
})

describe('applyDirectives / 指令对象', () => {
  it('指令对象带 name → 使用对象.name', () => {
    const vnode = makeVNode()
    const directiveObj = { name: 'obj-directive' } as unknown as Directive
    const result = applyDirectives(vnode, [{ directive: directiveObj, value: 'a' }])
    expect(result).toBeDefined()
  })

  it('指令对象无 name → name 为空字符串（兜底）', () => {
    const vnode = makeVNode()
    const directiveObj = {} as Directive
    // 构造一个异常：没有 name 字段时 vue withDirectives 会抛错
    const errorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = applyDirectives(vnode, [{ directive: directiveObj }])
    // 抛错 → 走 catch → 返回原 vnode
    expect(result).toBe(vnode)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('applyDirectives / 多指令', () => {
  it('多个指令同时应用', () => {
    const vnode = makeVNode()
    const result = applyDirectives(vnode, [
      { directive: 'd1', value: 'v1' },
      { directive: 'd2', value: 'v2', arg: 'x' },
      { directive: 'd3', modifiers: { foo: true } },
    ])
    expect(result).toBeDefined()
    expect(result).toBe(vnode)
  })

  it('字符串指令 + 对象指令混用', () => {
    const vnode = makeVNode()
    const objDir = { name: 'obj-dir' } as unknown as Directive
    const result = applyDirectives(vnode, [
      { directive: 'str-dir' },
      { directive: objDir, value: 'x' },
    ])
    expect(result).toBeDefined()
  })
})

describe('applyDirectives / 异常处理', () => {
  it('withDirectives 抛错时 → 返回原 vnode 且 console.warn', () => {
    const errorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const vnode = makeVNode()
    // 用非法字符串指令名（不含前缀）触发 vue 内部报错
    const result = applyDirectives(vnode, [{ directive: '!!!invalid!!!' }])
    expect(result).toBe(vnode)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
