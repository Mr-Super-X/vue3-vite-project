import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useRequest } from './useRequest'

describe('useRequest（基础三态）', () => {
  it('transitions loading → success on resolve', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 })
    const { data, loading, error, execute } = useRequest(fetcher, { immediate: false })

    expect(loading.value).toBe(false)
    expect(data.value).toBe(null)

    const p = execute()
    expect(loading.value).toBe(true)
    await p
    expect(loading.value).toBe(false)
    expect(data.value).toEqual({ id: 1 })
    expect(error.value).toBe(null)
  })

  it('captures error and exposes isEmpty', async () => {
    const fetcher = vi.fn().mockResolvedValue(null)
    const { data, isEmpty, execute } = useRequest(fetcher, { immediate: false })
    await execute()
    expect(data.value).toBe(null)
    expect(isEmpty.value).toBe(true)
  })

  it('invokes onError callback on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const onError = vi.fn()
    const { error, execute } = useRequest(fetcher, { immediate: false, onError })
    await execute()
    expect(error.value?.message).toBe('boom')
    expect(onError).toHaveBeenCalledOnce()
  })
})

describe('useRequest（immediate 默认值）', () => {
  it('immediate: true 默认立即执行', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    useRequest(fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('immediate: false 不立即执行', () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    useRequest(fetcher, { immediate: false })
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('useRequest（onSuccess）', () => {
  it('成功后回调被调用，传入结果', async () => {
    const onSuccess = vi.fn()
    const { execute } = useRequest(() => Promise.resolve('result'), {
      immediate: false,
      onSuccess,
    })
    await execute()
    expect(onSuccess).toHaveBeenCalledWith('result')
  })
})

describe('useRequest（refresh 别名）', () => {
  it('refresh 与 execute 行为一致', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    const { refresh } = useRequest(fetcher, { immediate: false })
    await refresh()
    expect(fetcher).toHaveBeenCalledTimes(1)
    await refresh()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('useRequest（deps 自动重执行）', () => {
  it('ref deps 变化时自动重新执行', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    const keyword = ref('a')
    useRequest(fetcher, { immediate: false, deps: [keyword] })
    expect(fetcher).not.toHaveBeenCalled()
    keyword.value = 'b'
    await nextTick()
    expect(fetcher).toHaveBeenCalledTimes(1)
    keyword.value = 'c'
    await nextTick()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('非响应式 deps 不会触发（仅响应式 ref 生效）', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    useRequest(fetcher, { immediate: false, deps: ['plain', 'values'] })
    expect(fetcher).not.toHaveBeenCalled()
    await nextTick()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('混合 deps 中只响应 ref 部分', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    const refValue = ref(1)
    useRequest(fetcher, { immediate: false, deps: [refValue, 'static'] })
    expect(fetcher).not.toHaveBeenCalled()
    refValue.value = 2
    await nextTick()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('useRequest（错误归一）', () => {
  it('非 Error 抛出归一为 Error', async () => {
    const fetcher = vi.fn().mockRejectedValue('plain string error')
    const onError = vi.fn()
    const { error, execute } = useRequest(fetcher, { immediate: false, onError })
    await execute()
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('plain string error')
  })

  it('Error 对象原样捕获', async () => {
    const original = new Error('original')
    const fetcher = vi.fn().mockRejectedValue(original)
    const { error, execute } = useRequest(fetcher, { immediate: false })
    await execute()
    expect(error.value).toBe(original)
  })
})

describe('useRequest（isEmpty 边界）', () => {
  it('loading 时 isEmpty 为 false', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('ok'), 10)))
    const { isEmpty, execute } = useRequest(fetcher, { immediate: false })
    void execute()
    await nextTick()
    expect(isEmpty.value).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 20))
  })

  it('error 时 isEmpty 为 false', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('e'))
    const { isEmpty, execute } = useRequest(fetcher, { immediate: false })
    await execute()
    expect(isEmpty.value).toBe(false)
  })

  it('data 有值时 isEmpty 为 false', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 })
    const { isEmpty, execute } = useRequest(fetcher, { immediate: false })
    await execute()
    expect(isEmpty.value).toBe(false)
  })

  it('data=null + 无 loading + 无 error 时 isEmpty 为 true', () => {
    const fetcher = vi.fn().mockResolvedValue('ok')
    const { isEmpty } = useRequest(fetcher, { immediate: false })
    expect(isEmpty.value).toBe(true)
  })
})
