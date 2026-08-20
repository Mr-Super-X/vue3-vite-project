import { describe, it, expect, vi } from 'vitest'
import { createApp, type Component } from 'vue'
import FormSchemaPlugin from './index'
import { validate } from './composables/use-validate'
import { resolveElComponentName } from './element-plus-adapter'

describe('FormSchemaPlugin', () => {
  it('install(app) registers XForm globally', () => {
    const app = createApp({})
    const componentSpy = vi.spyOn(app, 'component')
    app.use(FormSchemaPlugin)
    expect(componentSpy).toHaveBeenCalledWith('XForm', expect.anything())
  })

  it('re-exports validate() from use-validate', () => {
    expect(typeof validate).toBe('function')
    const result = validate({ component: 'Input' })
    expect(result.isValid).toBe(true)
  })

  it('re-exports resolveElComponentName() from adapter', () => {
    expect(typeof resolveElComponentName).toBe('function')
    expect(resolveElComponentName('Input')).toBe('ElInput')
  })

  it('default export has install method', () => {
    expect(typeof (FormSchemaPlugin as Component & { install?: unknown }).install).toBe('function')
  })

  it('default export is installable via app.use', () => {
    const app = createApp({})
    expect(() => app.use(FormSchemaPlugin)).not.toThrow()
  })
})
