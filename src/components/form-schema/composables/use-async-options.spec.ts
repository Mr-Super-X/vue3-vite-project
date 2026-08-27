import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAsyncOptions } from './use-async-options'
import type { SchemaNode } from '../types'

describe('useAsyncOptions', () => {
  it('calls source immediately by default and stores transformed data', async () => {
    const node: SchemaNode = {
      component: 'Select',
      asyncOptions: {
        source: async () => [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ],
        transform: (raw) =>
          (raw as Array<{ id: number; name: string }>).map((item) => ({
            label: item.name,
            value: item.id,
          })),
      },
    }
    const model = ref({})
    const state = useAsyncOptions(node, model)
    expect(state.loading.value).toBe(true)
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(state.loading.value).toBe(false)
    expect(state.data.value).toEqual([
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ])
  })

  it('does not call source when immediate is false', () => {
    const source = vi.fn().mockResolvedValue([])
    const node: SchemaNode = {
      component: 'Select',
      asyncOptions: { source, immediate: false },
    }
    const model = ref({})
    useAsyncOptions(node, model)
    expect(source).not.toHaveBeenCalled()
  })

  it('re-fetches when deps change', async () => {
    const source = vi.fn().mockImplementation(() => Promise.resolve([{ label: 'x', value: 1 }]))
    const node: SchemaNode = {
      component: 'Select',
      asyncOptions: { source, deps: 'category' },
    }
    const model = ref({ category: 'a' })
    useAsyncOptions(node, model)
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(source).toHaveBeenCalledTimes(1)
    model.value.category = 'b'
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(source).toHaveBeenCalledTimes(2)
  })

  it('calls onError when source rejects', async () => {
    const onError = vi.fn()
    const node: SchemaNode = {
      component: 'Select',
      asyncOptions: {
        source: async () => {
          throw new Error('network')
        },
        onError,
      },
    }
    const model = ref({})
    const state = useAsyncOptions(node, model)
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(state.error.value).toBeInstanceOf(Error)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('useAsyncOptions / 竞态防护（② 回归）', () => {
  it('乱序返回时旧响应被丢弃（序号令牌）', async () => {
    // 第一次请求慢、第二次快 —— 旧响应后返回也不得覆盖新数据
    let resolveFirst!: (v: string[]) => void
    const first = new Promise<string[]>((r) => {
      resolveFirst = r
    })
    let call = 0
    const node: SchemaNode = {
      component: 'Select',
      asyncOptions: {
        deps: 'city',
        source: () => {
          call++
          return call === 1 ? first : Promise.resolve(['new'])
        },
      },
    }
    const model = ref({ city: 'a' })
    const state = useAsyncOptions(node, model)
    // 改 deps 触发第二次请求（快，立即 resolve）
    model.value.city = 'b'
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(call).toBe(2)
    expect(state.data.value).toEqual(['new'])
    // 第一次（旧）后返回 —— 应被丢弃
    resolveFirst(['old'])
    await new Promise((r) => setTimeout(r, 0))
    expect(state.data.value).toEqual(['new'])
  })

  it('stop() 后在途响应不再写入 state', async () => {
    let resolveReq!: (v: string[]) => void
    const pending = new Promise<string[]>((r) => {
      resolveReq = r
    })
    const node: SchemaNode = { component: 'Select', asyncOptions: { source: () => pending } }
    const state = useAsyncOptions(node, ref({}))
    state.stop()
    resolveReq(['x'])
    await new Promise((r) => setTimeout(r, 0))
    expect(state.data.value).toEqual([])
  })
})
