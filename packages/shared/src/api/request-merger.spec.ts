import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mergeKey, shouldMerge, withMerge, _resetMerger } from './request-merger'

describe('mergeKey', () => {
  it('不同 url 视为不同 key', () => {
    expect(mergeKey({ url: '/a', method: 'get' })).not.toBe(mergeKey({ url: '/b', method: 'get' }))
  })

  it('method 默认补 get', () => {
    expect(mergeKey({ url: '/a' })).toBe('get|/a||')
  })

  it('params 字段顺序无关（排序后哈希）', () => {
    expect(mergeKey({ url: '/a', method: 'get', params: { b: 2, a: 1 } })).toBe(
      mergeKey({ url: '/a', method: 'get', params: { a: 1, b: 2 } })
    )
  })

  it('data 也参与 key', () => {
    expect(mergeKey({ url: '/a', method: 'post', data: { x: 1 } })).not.toBe(
      mergeKey({ url: '/a', method: 'post' })
    )
  })
})

describe('shouldMerge', () => {
  it('默认只对 GET/HEAD 合并', () => {
    expect(shouldMerge({ url: '/a', method: 'get' })).toBe(50)
    expect(shouldMerge({ url: '/a', method: 'head' })).toBe(50)
    expect(shouldMerge({ url: '/a', method: 'post' })).toBe(0)
    expect(shouldMerge({ url: '/a', method: 'put' })).toBe(0)
    expect(shouldMerge({ url: '/a', method: 'patch' })).toBe(0)
    expect(shouldMerge({ url: '/a', method: 'delete' })).toBe(0)
  })

  it("merge: 'never' 强制关闭", () => {
    expect(shouldMerge({ url: '/a', method: 'get', merge: 'never' })).toBe(0)
  })

  it('merge: number 覆盖窗口时长', () => {
    expect(shouldMerge({ url: '/a', method: 'post', merge: 100 })).toBe(100)
  })
})

describe('withMerge', () => {
  beforeEach(() => _resetMerger())

  it('窗口内同参 GET 只发一次', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = withMerge(fn)
    const cfg = { url: '/a', method: 'get' }

    const [r1, r2, r3] = await Promise.all([wrapped(cfg), wrapped(cfg), wrapped(cfg)])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(r1).toEqual({ ok: true })
    expect(r2).toEqual({ ok: true })
    expect(r3).toEqual({ ok: true })
  })

  it('POST 默认不合并（写请求安全）', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = withMerge(fn)

    await Promise.all([
      wrapped({ url: '/a', method: 'post', data: { x: 1 } }),
      wrapped({ url: '/a', method: 'post', data: { x: 1 } }),
    ])

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('窗口过后重新发起', async () => {
    vi.useFakeTimers()
    const fn = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = withMerge(fn, { windowMs: 10 })
    const cfg = { url: '/a', method: 'get' }

    await wrapped(cfg)
    // advance timers past the cleanup delay
    vi.advanceTimersByTime(20)
    await wrapped(cfg)

    expect(fn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('失败时所有等待方都收到同一个 rejection', async () => {
    const err = new Error('boom')
    const fn = vi.fn().mockRejectedValue(err)
    const wrapped = withMerge(fn)
    const cfg = { url: '/a', method: 'get' }

    const results = await Promise.allSettled([wrapped(cfg), wrapped(cfg)])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(results[0].status).toBe('rejected')
    expect(results[1].status).toBe('rejected')
    expect((results[0] as PromiseRejectedResult).reason).toBe(err)
  })
})
