import { describe, it, expect } from 'vitest'
import { createNamespace } from './bem'

describe('createNamespace', () => {
  const bem = createNamespace('button')

  describe('b()', () => {
    it('返回基础 block 类名', () => {
      expect(bem.b()).toBe('gm-button')
    })

    it('带 blockSuffix 返回 gm-button-group', () => {
      expect(bem.b('group')).toBe('gm-button-group')
    })

    it('空字符串后缀等价于无后缀', () => {
      expect(bem.b('')).toBe('gm-button')
    })
  })

  describe('e()', () => {
    it('返回 element 类名', () => {
      expect(bem.e('icon')).toBe('gm-button__icon')
    })

    it('空字符串返回空字符串（避免 gm-button__）', () => {
      expect(bem.e('')).toBe('')
    })
  })

  describe('m()', () => {
    it('返回 modifier 类名', () => {
      expect(bem.m('large')).toBe('gm-button--large')
    })

    it('空字符串返回空字符串（避免 gm-button--）', () => {
      expect(bem.m('')).toBe('')
    })
  })

  describe('be()', () => {
    it('返回 block + element 类名', () => {
      expect(bem.be('group', 'icon')).toBe('gm-button-group__icon')
    })

    it('任一参数缺失返回空字符串', () => {
      expect(bem.be('', 'icon')).toBe('')
      expect(bem.be('group', '')).toBe('')
      expect(bem.be('', '')).toBe('')
    })
  })

  describe('bm()', () => {
    it('返回 block + modifier 类名', () => {
      expect(bem.bm('group', 'large')).toBe('gm-button-group--large')
    })

    it('任一参数缺失返回空字符串', () => {
      expect(bem.bm('', 'large')).toBe('')
      expect(bem.bm('group', '')).toBe('')
    })
  })

  describe('em()', () => {
    it('返回 element + modifier 类名', () => {
      expect(bem.em('icon', 'large')).toBe('gm-button__icon--large')
    })

    it('任一参数缺失返回空字符串', () => {
      expect(bem.em('', 'large')).toBe('')
      expect(bem.em('icon', '')).toBe('')
    })
  })

  describe('bem()', () => {
    it('返回 block + element + modifier 类名', () => {
      expect(bem.bem('group', 'icon', 'large')).toBe('gm-button-group__icon--large')
    })

    it('任一参数缺失返回空字符串', () => {
      expect(bem.bem('', 'icon', 'large')).toBe('')
      expect(bem.bem('group', '', 'large')).toBe('')
      expect(bem.bem('group', 'icon', '')).toBe('')
    })
  })

  describe('is()', () => {
    it('state 为 true 返回 is-{name}', () => {
      expect(bem.is('loading', true)).toBe('is-loading')
      expect(bem.is('checked', true)).toBe('is-checked')
      expect(bem.is('enabled', true)).toBe('is-enabled')
    })

    it('state 为 false 返回空字符串', () => {
      expect(bem.is('loading', false)).toBe('')
    })

    it('state 为 null / undefined 返回空字符串', () => {
      expect(bem.is('loading', null)).toBe('')
      expect(bem.is('loading', undefined)).toBe('')
    })
  })

  describe('createNamespace 前缀', () => {
    it('始终以 gm- 开头', () => {
      expect(createNamespace('foo').b()).toBe('gm-foo')
    })

    it('支持自定义 name（含连字符的复合名）', () => {
      expect(createNamespace('user-card').b()).toBe('gm-user-card')
      expect(createNamespace('login-form').e('submit')).toBe('gm-login-form__submit')
    })
  })
})
