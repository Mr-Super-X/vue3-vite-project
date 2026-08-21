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
