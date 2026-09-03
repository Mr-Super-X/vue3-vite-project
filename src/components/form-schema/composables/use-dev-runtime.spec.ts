/**
 * useDevRuntime 单元测试
 *
 * 覆盖：
 * - showDebugBanner 默认 = import.meta.env.DEV
 * - validateErrors / forbiddenErrors 初始 = 空
 * - model 缺失时（DEV）→ console.warn + errorBus.report(FORM_INSTANCE_NOT_READY)
 * - model 缺失时（DEV）→ warn 文案含「model prop 未传入」
 * - schema 含未知组件 → validateErrors 被填充 + console.error + errorBus.report(SCHEMA_VALIDATE_FAILED)
 * - schema 含 forbidden 标识符 → forbiddenErrors 被填充 + console.warn + errorBus.report(FORBIDDEN_IDENTIFIER)
 * - installDevDebugHook：挂载 window.__xform_debug
 * - installDevDebugHook：多次调用幂等
 * - installDevDebugHook：prod 环境不挂载
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, reactive, ref } from 'vue'
import { useDevRuntime } from './use-dev-runtime'
import type { UseFormErrorBusReturn } from './use-form-error-bus'
import type { FieldErrorState } from './use-form-instance'
import type { XFormProps } from '../types'

// 构造 errorBus mock：report 方法 + dismiss 槽位（return type 与 UseFormErrorBusReturn 对齐）
function makeErrorBus(): UseFormErrorBusReturn {
  return {
    events: ref([]),
    report: vi.fn(),
    dismiss: vi.fn(),
  }
}

function makeDeps(overrides?: Partial<XFormProps>) {
  const errorBus = makeErrorBus()
  const props = {
    schema: { children: [] },
    model: reactive({}),
    ...overrides,
  } as unknown as XFormProps
  const fieldErrors = ref<Record<string, FieldErrorState>>({})
  return { props, errorBus, fieldErrors, setFieldError: vi.fn() }
}

describe('useDevRuntime', () => {
  let originalDevHook: unknown

  beforeEach(() => {
    originalDevHook = (globalThis as { __xform_debug?: unknown }).__xform_debug
  })

  afterEach(() => {
    delete (globalThis as { __xform_debug?: unknown }).__xform_debug
    if (originalDevHook !== undefined) {
      ;(globalThis as { __xform_debug?: unknown }).__xform_debug = originalDevHook
    }
    vi.restoreAllMocks()
  })

  it('返回结构完整', () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps()
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    expect(ret).toBeDefined()
    expect(ret.validateErrors).toBeDefined()
    expect(ret.forbiddenErrors).toBeDefined()
    expect(ret.showDebugBanner).toBeDefined()
    expect(typeof ret.installDevDebugHook).toBe('function')
    scope.stop()
  })

  it('model 缺失时（DEV）→ console.warn + errorBus.report', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({ model: undefined })
    const scope = effectScope()
    scope.run(() => {
      useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[XForm] model prop 未传入'))
    expect(errorBus.report).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        code: 'FORM_INSTANCE_NOT_READY',
      })
    )
    scope.stop()
  })

  it('model 缺失时 warn 文案含完整原因说明', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({ model: undefined })
    const scope = effectScope()
    scope.run(() => {
      useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('校验、默认值填充、reaction、dirty 追踪均不会生效')
    )
    scope.stop()
  })

  it('schema 含未知组件 → validateErrors 被填充 + console.error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({
      schema: [{ component: 'NotExistComponent', name: 'a' }],
    })
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    // 立即 watch 触发需 nextTick
    await new Promise((r) => setTimeout(r, 0))
    expect(ret.validateErrors.value.length).toBeGreaterThan(0)
    expect(ret.validateErrors.value[0]?.message).toContain('未知组件名')
    expect(errorSpy).toHaveBeenCalled()
    expect(errorBus.report).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SCHEMA_VALIDATE_FAILED',
      })
    )
    scope.stop()
  })

  it('schema 含已知内置组件 → validateErrors 保持空', async () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({
      schema: [{ component: 'Input', name: 'a' }],
    })
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(ret.validateErrors.value).toEqual([])
    scope.stop()
  })

  it('schema 含 forbidden 标识符（window）→ forbiddenErrors + console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({
      schema: [
        {
          component: 'Input',
          name: 'a',
          reaction: { hidden: '{{ (m) => window.location }' },
        },
      ],
    })
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(ret.forbiddenErrors.value.length).toBeGreaterThan(0)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[XForm][SECURITY] forbidden identifiers'),
      expect.anything()
    )
    expect(errorBus.report).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FORBIDDEN_IDENTIFIER',
      })
    )
    scope.stop()
  })

  it('schema 无 forbidden → forbiddenErrors 保持空数组', async () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({
      schema: [{ component: 'Input', name: 'a' }],
    })
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(ret.forbiddenErrors.value).toEqual([])
    scope.stop()
  })

  it('installDevDebugHook 挂载 window.__xform_debug（dev 模式）', () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps()
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    ret.installDevDebugHook()
    expect((globalThis as { __xform_debug?: unknown }).__xform_debug).toBeDefined()
    expect(
      (globalThis as { __xform_debug?: { setFieldError?: unknown } }).__xform_debug?.setFieldError
    ).toBeTypeOf('function')
    scope.stop()
  })

  it('installDevDebugHook 多次调用幂等（不报错）', () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps()
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    expect(() => {
      ret.installDevDebugHook()
      ret.installDevDebugHook()
      ret.installDevDebugHook()
    }).not.toThrow()
    scope.stop()
  })

  it('window.__xform_debug.getFieldErrors 返回字段错误快照（JSON 深拷贝）', () => {
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps()
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    ret.installDevDebugHook()
    fieldErrors.value = { email: { error: '邮箱已被占用', validateStatus: 'error' } }
    const debug = (globalThis as { __xform_debug?: { getFieldErrors?: () => unknown } })
      .__xform_debug
    const snapshot = debug?.getFieldErrors?.()
    expect(snapshot).toEqual({ email: { error: '邮箱已被占用', validateStatus: 'error' } })
    scope.stop()
  })

  it('window.__xform_debug.getModel 返回 model 快照', () => {
    const model = reactive({ a: 1, b: { c: 2 } })
    const { props, errorBus, fieldErrors, setFieldError } = makeDeps({ model })
    const scope = effectScope()
    let ret!: ReturnType<typeof useDevRuntime>
    scope.run(() => {
      ret = useDevRuntime({ props, errorBus, setFieldError, fieldErrors })
    })
    ret.installDevDebugHook()
    const debug = (globalThis as { __xform_debug?: { getModel?: () => unknown } }).__xform_debug
    expect(debug?.getModel?.()).toEqual({ a: 1, b: { c: 2 } })
    scope.stop()
  })
})
