/**
 * resolve-component 单元测试
 *
 * 覆盖：
 * - resolveComponentFor: 用户组件 / 内置短名 / ElXxx 全名 / 原生 HTML 标签
 * - EL_COMPONENT_MAP: 26 个内置映射完整性
 * - isElUpload: component name + Comp 引用双重判断
 * - isPictureCardUpload / isDragUpload: 基于 isElUpload + props 判断
 */
import { describe, expect, it } from 'vitest'
import { ElUpload } from 'element-plus'
import {
  EL_COMPONENT_MAP,
  isDragUpload,
  isElUpload,
  isPictureCardUpload,
  resolveComponentFor,
} from './resolve-component'
import type { SchemaNode } from '../types'

describe('resolveComponentFor', () => {
  it('undefined → null', () => {
    expect(resolveComponentFor(undefined)).toBeNull()
  })

  it('用户自定义 components → 用户版本优先', () => {
    const MyInput = { name: 'MyInput' }
    const result = resolveComponentFor('MyInput', { MyInput })
    expect(result).toBe(MyInput)
  })

  it('内置短名 → EL_COMPONENT_MAP 查找', () => {
    const result = resolveComponentFor('Input')
    expect(result).toBe(EL_COMPONENT_MAP.Input)
  })

  it('ElXxx 全名 → 短名 fallback', () => {
    const result = resolveComponentFor('ElInput')
    expect(result).toBe(EL_COMPONENT_MAP.Input)
  })

  it('原生 HTML 标签（全小写）→ 返回字符串', () => {
    expect(resolveComponentFor('div')).toBe('div')
    expect(resolveComponentFor('span')).toBe('span')
  })

  it('未注册的组件名（混合大小写）→ null', () => {
    expect(resolveComponentFor('MyUnknownComponent')).toBeNull()
  })

  it('空 userComponents → 仍走内置查找', () => {
    const result = resolveComponentFor('Input', {})
    expect(result).toBe(EL_COMPONENT_MAP.Input)
  })
})

describe('EL_COMPONENT_MAP', () => {
  it('包含 26+ 个内置组件', () => {
    expect(Object.keys(EL_COMPONENT_MAP).length).toBeGreaterThanOrEqual(26)
  })

  it('Input / InputPassword / InputTextArea 都映射到 ElInput', () => {
    expect(EL_COMPONENT_MAP.Input).toBe(EL_COMPONENT_MAP.InputPassword)
    expect(EL_COMPONENT_MAP.Input).toBe(EL_COMPONENT_MAP.InputTextArea)
  })

  it('InputTag 映射到 ElInputTag（独立组件）', () => {
    expect(EL_COMPONENT_MAP.InputTag).toBeDefined()
  })

  it('Upload 映射到 ElUpload', () => {
    expect(EL_COMPONENT_MAP.Upload).toBe(ElUpload)
  })
})

describe('isElUpload', () => {
  it('name=Upload + Comp=ElUpload → true', () => {
    const node: SchemaNode = { component: 'Upload' }
    expect(isElUpload(node, ElUpload)).toBe(true)
  })

  it('name=ElUpload + Comp=ElUpload → true', () => {
    const node: SchemaNode = { component: 'ElUpload' }
    expect(isElUpload(node, ElUpload)).toBe(true)
  })

  it('name=Upload + Comp=其他 → false（避免用户 components 覆盖后误判）', () => {
    const node: SchemaNode = { component: 'Upload' }
    expect(isElUpload(node, { name: 'CustomUpload' })).toBe(false)
  })

  it('name=其他 → false', () => {
    const node: SchemaNode = { component: 'Input' }
    expect(isElUpload(node, ElUpload)).toBe(false)
  })

  it('component 是对象（非字符串） → false', () => {
    const node: SchemaNode = { component: { name: 'X' } as never }
    expect(isElUpload(node, ElUpload)).toBe(false)
  })
})

describe('isPictureCardUpload', () => {
  it('Upload + listType=picture-card → true', () => {
    const node: SchemaNode = { component: 'Upload', props: { listType: 'picture-card' } }
    expect(isPictureCardUpload(node, ElUpload)).toBe(true)
  })

  it('Upload + listType=text → false', () => {
    const node: SchemaNode = { component: 'Upload', props: { listType: 'text' } }
    expect(isPictureCardUpload(node, ElUpload)).toBe(false)
  })

  it('非 ElUpload → false（即使 props.listType 对）', () => {
    const node: SchemaNode = { component: 'Upload', props: { listType: 'picture-card' } }
    expect(isPictureCardUpload(node, { name: 'CustomUpload' })).toBe(false)
  })

  it('listType 缺失 → false', () => {
    const node: SchemaNode = { component: 'Upload' }
    expect(isPictureCardUpload(node, ElUpload)).toBe(false)
  })
})

describe('isDragUpload', () => {
  it('Upload + drag=true → true', () => {
    const node: SchemaNode = { component: 'Upload', props: { drag: true } }
    expect(isDragUpload(node, ElUpload)).toBe(true)
  })

  it('Upload + drag=false → false', () => {
    const node: SchemaNode = { component: 'Upload', props: { drag: false } }
    expect(isDragUpload(node, ElUpload)).toBe(false)
  })

  it('Upload + drag 缺失 → false', () => {
    const node: SchemaNode = { component: 'Upload' }
    expect(isDragUpload(node, ElUpload)).toBe(false)
  })

  it('非 ElUpload → false', () => {
    const node: SchemaNode = { component: 'Upload', props: { drag: true } }
    expect(isDragUpload(node, { name: 'CustomUpload' })).toBe(false)
  })
})
