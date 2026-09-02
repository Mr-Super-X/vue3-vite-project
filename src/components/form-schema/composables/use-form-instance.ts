/**
 * useFormInstance —— el-form 实例方法编排（P2-A1 拆分后主文件）
 *
 * P2-A1 拆分前：394 行（含 setFieldError 双路径 + watch 守护）
 * P2-A1 拆分后：本文件 ~250 行，setFieldError dual-path 已抽到 ./use-set-field-error.ts
 *
 * 职责：
 *   - el-form 实例引用 + getRef / clearValidate / resetFields / validateField 等基础方法
 *   - 数组操作 addItem / removeItem / moveItem（含 clearArraySubtree 行清理）
 *   - validateFormWithZod（独立 zod 校验包装，透传 validateWithZod）
 *   - 委托 useSetFieldError 处理 setFieldError / setFieldValidating + watch 守护
 */
import { ref, toRaw, type ComponentPublicInstance, type Ref } from 'vue'
import { useSetFieldError, type FieldErrorState } from './use-set-field-error'
import { validateWithZod } from './use-validate'
import type { UseFormErrorBusReturn } from './use-form-error-bus'
import type { ZodType } from 'zod'

/** 运行时方法对象（InstanceType<typeof ElForm> 会丢失 validate 等方法） */
export type ElFormInstance = {
  validate?: (callback?: (valid: boolean) => void) => Promise<boolean>
  /**
   * clearValidate 运行时支持 props?: string[] 参数（仅清除指定字段），
   * 但 element-plus 2.x TS 类型声明为 () => void —— 这里用宽松签名补齐
   */
  clearValidate?: (props?: string | string[]) => void
  resetFields?: (props?: string | string[]) => void
  scrollToField?: (name: string) => void
  /**
   * 校验指定字段 —— element-plus 2.x 实际支持但 TS 类型声明不完整
   * validateField(prop?: string | string[]): Promise<void>（校验失败 reject）
   */
  validateField?: (prop?: string | string[]) => Promise<void>
  /**
   * 同步 ElForm 初始值快照 —— element-plus 2.x 内部方法，
   * 用于 defaultValue 填充后防止子组件 mount 副作用（如 ElRate emit 0）导致 resetFields 基准值错乱。
   */
  setInitialValues?: (initModel: Record<string, unknown>) => void
}

/** 重新导出 FieldErrorState 保持向后兼容 */
export type { FieldErrorState }

export function useFormInstance(
  model: () => Record<string, unknown> | undefined,
  zodSchema: () => ZodType | undefined,
  /** 阶段 3.1：外部字段错误状态 ref（XForm.vue 创建并传入） */
  externalErrors?: Ref<Record<string, FieldErrorState>>,
  /** OPT-7：错误事件总线 —— 显式 deps 传入（避免 provide/inject 在嵌套 composable 中失效） */
  errorBus?: UseFormErrorBusReturn
) {
  const elFormRef = ref<ElFormInstance | null>(null)

  // setFieldError 双路径 + watch 守护 —— 委托独立 composable（P2-A1 拆分）
  // 仅在 externalErrors 存在时初始化（无 externalErrors 表示 XForm.vue 未启用红字路径，
  // 此场景不需要 watch 守护；setFieldError 也只是空操作）
  const { setFieldError } = useSetFieldError({
    externalErrors: externalErrors ?? ref<Record<string, FieldErrorState>>({}),
    getFields: () =>
      (elFormRef.value as unknown as { fields?: unknown[] } | null)?.fields as
        | Array<{ prop?: string | { value?: string }; propString?: string | { value?: string } }>
        | undefined,
    // exactOptionalPropertyTypes: 条件展开避免传 undefined
    ...(errorBus ? { errorBus } : {}),
  })

  function getRef(key: string): ComponentPublicInstance | HTMLElement | null {
    const map = (elFormRef.value as unknown as { $?: Record<string, unknown> } | null)?.$ ?? {}
    return (map[key] as ComponentPublicInstance | HTMLElement) ?? null
  }

  function validateForm(): Promise<boolean> {
    return new Promise((resolve) => {
      const ef = elFormRef.value
      // 未绑定 el-form 时静默 resolve(true) 会把"配置/时序错误"伪装成"校验通过"，
      // 提交链路会带着未校验的数据继续走 —— 按失败处理并给出可诊断的错误日志
      if (!ef?.validate) {
        console.error(
          '[XForm] validate 调用时 el-form 实例未绑定（elFormRef 为空），已按校验失败处理'
        )
        return resolve(false)
      }
      // element-plus 2.x 即使传 callback 仍 reject errorsMap（微任务），需 Promise.catch 接住
      Promise.resolve(ef.validate((valid: boolean) => resolve(valid))).catch(() => resolve(false))
    })
  }

  /** 从 el-form field 上下文提取字段路径名（优先 propString，兼容 ref/字符串两种形态） */
  function extractFieldName(field: unknown): string | null {
    const raw = toRaw(field) as {
      prop?: string | Ref<string>
      propString?: string | Ref<string>
    }
    const propString =
      raw.propString && typeof raw.propString === 'object' && 'value' in raw.propString
        ? raw.propString.value
        : raw.propString
    const prop =
      raw.prop && typeof raw.prop === 'object' && 'value' in raw.prop ? raw.prop.value : raw.prop
    const name = typeof propString === 'string' ? propString : prop
    return typeof name === 'string' ? name : null
  }

  /** 从 ref-like 值解包字符串（element-plus 内部字段状态常用 ref<string> 形态） */
  function readRefStr(v: string | Ref<string> | undefined): string | undefined {
    if (v === undefined || v === null) return undefined
    if (typeof v === 'string') return v
    if (typeof v === 'object' && 'value' in v) {
      const x = (v as { value: unknown }).value
      return typeof x === 'string' ? x : undefined
    }
    return undefined
  }

  /**
   * 从 el-form fields 提取 validateState=error 的字段详情，仅命中过滤集合的字段
   * 用于 validateField 失败时构造 OSD toast 与 console.error 输出（与 validateForm 对齐）
   */
  function collectElFieldErrors(
    ef: { fields?: unknown[] },
    filterNames: Set<string>
  ): Array<{ field: string; message: string; value?: unknown }> {
    const fields = ef.fields ?? []
    const details: Array<{ field: string; message: string; value?: unknown }> = []
    for (const f of fields) {
      const raw = toRaw(f) as {
        propString?: string | Ref<string>
        prop?: string | Ref<string>
        validateState?: string | Ref<string>
        validateMessage?: string | Ref<string>
        fieldValue?: unknown
      }
      const validateState = readRefStr(raw.validateState)
      if (validateState !== 'error') continue
      const msg = readRefStr(raw.validateMessage)
      if (!msg) continue
      const fieldName = readRefStr(raw.propString) || readRefStr(raw.prop)
      if (!fieldName || !filterNames.has(fieldName)) continue
      details.push({ field: fieldName, message: msg, value: raw.fieldValue })
    }
    return details
  }

  /**
   * 数组删/移后按行清理失效的校验态 —— 此前直接调无参 clearValidate() 会清空
   * 全表单错误（误伤其他字段的服务端/本地红字），且绕过 externalErrors 同步。
   * 只清 fromIndex 及之后的行：错误是位置性的，索引位移后旧错误指向错位的行；
   * fromIndex 之前的行索引未变，其错误仍然有效，必须保留。
   */
  function clearArraySubtree(name: string, fromIndex: number): void {
    const ef = elFormRef.value as unknown as { fields?: unknown[] } | null
    const escaped = name.replace(/[.*+?^${}()[\]\\]/g, '\\$&')
    const rowReg = new RegExp(`^${escaped}\\[(\\d+)\\]`)
    const names = (ef?.fields ?? []).map(extractFieldName).filter((n): n is string => {
      if (n === null) return false
      if (n === name || n.startsWith(`${name}.`)) return true
      const m = n.match(rowReg)
      return m !== null && Number(m[1]) >= fromIndex
    })
    // element-plus filterFields 对空数组的语义是"清全部字段"——
    // 一个匹配都提不到时必须什么都不做，否则等于退回无参 clearValidate 的误伤行为
    if (names.length === 0) return
    clearValidate(names)
  }

  function clearValidate(names?: string[]): void {
    // 阶段 3.1：clearValidate 同时清理 externalErrors（保持与 setFieldError 同步）
    if (names && externalErrors) {
      for (const name of names) delete externalErrors.value[name]
    } else if (externalErrors) {
      externalErrors.value = {}
    }
    elFormRef.value?.clearValidate?.(names)
  }

  function resetFields(names?: string | string[]): void {
    // 部分重置：只清指定字段的 externalErrors；全量重置才清空整个 externalErrors
    if (externalErrors) {
      if (names !== undefined) {
        const list = Array.isArray(names) ? names : [names]
        for (const n of list) delete externalErrors.value[n]
      } else {
        externalErrors.value = {}
      }
    }
    elFormRef.value?.resetFields?.(names)
  }

  /**
   * 同步 ElForm 初始值快照。
   * 用于 schema defaultValue 填充后：防止子组件 mount 时副作用（如 ElRate 在 modelValue
   * 为 falsy 时 emit 0）导致 ElForm 捕获到错误的初始值，进而使 resetFields 无法回到 defaultValue。
   */
  function setInitialValues(initModel: Record<string, unknown>): void {
    elFormRef.value?.setInitialValues?.(initModel)
  }

  /**
   * 校验指定字段（透传 el-form validateField）—— 与 validate() 风格一致返回 boolean：
   * 成功 true；校验失败 / el-form 未绑定均 false
   * **失败时与 validateForm 对齐**：扫描 ef.fields 提取 validateState=error 的字段详情，
   * 触发 OSD toast（EL_FORM_VALIDATION_FAILED）与 console.error 输出。
   * 字段错误已由 el-form-item 红字展示，OSD/console 是给开发者的诊断反馈。
   */
  async function validateField(name: string | string[]): Promise<boolean> {
    const ef = elFormRef.value
    if (!ef?.validateField) {
      console.error(
        '[XForm] validateField 调用时 el-form 实例未绑定（elFormRef 为空），已按校验失败处理'
      )
      return false
    }
    try {
      await ef.validateField(name)
      return true
    } catch {
      // 校验失败：与 validateForm 对齐 —— 扫描 ef.fields 提取命中字段的错误详情
      const efAny = ef as unknown as { fields?: unknown[] }
      const targetNames = Array.isArray(name) ? name : [name]
      const details = collectElFieldErrors(efAny, new Set(targetNames))
      if (details.length > 0) {
        console.error('[XForm] validateField failed:', details)
        // force: true —— 用户主动 validateField() 调用场景，每次都应反馈（不被 5s 去重）
        errorBus?.report({
          severity: 'error',
          code: 'EL_FORM_VALIDATION_FAILED',
          message: `字段校验失败 ${details.length} 项（详见表单红字）`,
          fields: details.map((d) => d.field),
          details,
          source: 'useFormInstance/validateField',
          force: true,
        })
      }
      return false
    }
  }

  function scrollToField(name: string): void {
    elFormRef.value?.scrollToField?.(name)
  }

  function validateFormWithZod(): { success: boolean; errors: import('zod').ZodError | null } {
    const zs = zodSchema()
    if (!zs) return { success: true, errors: null }
    return validateWithZod(zs, model() ?? {})
  }

  /** 数组操作：在 model[name] 末尾追加一项（追加不产生索引位移，无需清理任何校验态） */
  function addItem(name: string, init?: Record<string, unknown>): void {
    const m = model()
    if (!m) return
    if (!Array.isArray(m[name])) m[name] = []
    ;(m[name] as unknown[]).push(init ?? {})
  }

  /** 数组操作：删除 model[name][index] */
  function removeItem(name: string, index: number): void {
    const m = model()
    if (!m || !Array.isArray(m[name])) return
    const arr = m[name] as unknown[]
    if (index < 0 || index >= arr.length) return
    arr.splice(index, 1)
    // 被删行及之后的行索引位移（items[2].qty → items[1].qty），旧位置错误失效；
    // 之前的行不受影响，红字保留
    clearArraySubtree(name, index)
  }

  /** 数组操作：把 model[name][from] 移到 [to] */
  function moveItem(name: string, from: number, to: number): void {
    const m = model()
    if (!m || !Array.isArray(m[name])) return
    const arr = m[name] as unknown[]
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    // [min(from,to), max(from,to)] 区间内的行索引均变化，区间外不受影响
    clearArraySubtree(name, Math.min(from, to))
  }

  /** 手动标记某个字段为校验中(el-form-item 显示 loading 图标) */
  function setFieldValidating(name: string): void {
    setFieldError(name, '', 'validating')
  }

  return {
    elFormRef,
    getRef,
    validateForm,
    clearValidate,
    resetFields,
    setInitialValues,
    validateField,
    scrollToField,
    validateFormWithZod,
    addItem,
    removeItem,
    moveItem,
    setFieldError,
    setFieldValidating,
    // 阶段 3.1：暴露 externalErrors ref 让调用方（如 XForm.vue）能直接读状态
    externalErrors,
  }
}
