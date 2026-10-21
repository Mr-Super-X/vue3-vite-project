import { describe, it, expect, vi } from 'vitest'
import { isIdempotent, withRetry } from './retry'
import { ApiError } from './types/error'

describe('isIdempotent', () => {
  it('GET/HEAD/OPTIONS 默认幂等', () => {
    expect(isIdempotent('get')).toBe(true)
    expect(isIdempotent('HEAD')).toBe(true)
    expect(isIdempotent('options')).toBe(true)
  })

  it('POST/PUT/PATCH/DELETE 默认非幂等', () => {
    expect(isIdempotent('post')).toBe(false)
    expect(isIdempotent('put')).toBe(false)
    expect(isIdempotent('patch')).toBe(false)
    expect(isIdempotent('delete')).toBe(false)
  })

  it('config.idempotent=true 强制开启', () => {
    expect(isIdempotent('post', { idempotent: true })).toBe(true)
  })

  it('config.idempotent=false 强制关闭', () => {
    expect(isIdempotent('get', { idempotent: false })).toBe(false)
  })
})

describe('withRetry', () => {
  it('首次成功不重试', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('重试直到成功', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom1'))
      .mockRejectedValueOnce(new Error('boom2'))
      .mockResolvedValueOnce('ok')

    await expect(withRetry(fn, { retries: 3, baseDelay: 1, backoff: 1 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('达到最大次数仍失败时抛出最后一次错误', async () => {
    const last = new Error('last')
    const fn = vi.fn().mockRejectedValue(last)
    await expect(
      withRetry(() => fn(), { retries: 2, baseDelay: 1, backoff: 1, shouldRetry: () => true })
    ).rejects.toBe(last)
  })

  it('shouldRetry=false 时立即抛出', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError({ code: 400, message: 'bad' }))
    await expect(
      withRetry(fn, { retries: 5, baseDelay: 1, shouldRetry: () => false })
    ).rejects.toBeInstanceOf(ApiError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('默认 5xx ApiError 才重试，4xx 立即抛', async () => {
    const fn500 = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ code: 500, message: 'srv', status: 500 }))
      .mockResolvedValueOnce('recovered')
    await expect(withRetry(fn500, { retries: 2, baseDelay: 1 })).resolves.toBe('recovered')
    expect(fn500).toHaveBeenCalledTimes(2)

    const fn400 = vi
      .fn()
      .mockRejectedValue(new ApiError({ code: 400, message: 'bad', status: 400 }))
    await expect(withRetry(fn400, { retries: 2, baseDelay: 1 })).rejects.toBeInstanceOf(ApiError)
    expect(fn400).toHaveBeenCalledTimes(1)
  })

  it('指数退避：delay = baseDelay * backoff^attempt', async () => {
    vi.useFakeTimers()
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValueOnce('ok')

    const p = withRetry(fn, { retries: 3, baseDelay: 100, backoff: 2 })

    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(fn).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(200)
    expect(fn).toHaveBeenCalledTimes(3)

    await expect(p).resolves.toBe('ok')
    vi.useRealTimers()
  })
})
