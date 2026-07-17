import { describe, it, expect, vi } from 'vitest'
import { useRequest } from './useRequest'

describe('useRequest', () => {
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