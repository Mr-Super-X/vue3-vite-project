// useDict composable 单测
//
// 覆盖：
//   - 首次调用触发 lazy fetch
//   - options 是 reactive（store 变化时同步）
//   - getLabel 命中 / 未命中 / null
//   - refresh 强制刷新

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/modules/dict', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/modules/dict')>()
  return {
    ...actual,
    dictApi: {
      ...actual.dictApi,
      getByType: vi.fn(),
    },
  }
})

import { dictApi } from '@/api/modules/dict'
import { useDictStore } from '@/store/modules/dict'
import { useDict } from './useDict'

const mockedGetByType = dictApi.getByType as unknown as ReturnType<typeof vi.fn>

describe('useDict', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedGetByType.mockReset()
  })

  it('首次调用自动触发 lazy fetch', async () => {
    const data = [{ value: 'a', label: 'A' }]
    mockedGetByType.mockResolvedValueOnce(data)
    const store = useDictStore()

    useDict('user_status')
    // setup 阶段异步发请求，等到 store 中数据写入
    await store.fetchDict('user_status').catch(() => {})
    expect(mockedGetByType).toHaveBeenCalled()
    expect(store.dicts['user_status']).toEqual(data)
  })

  it('options 是 reactive（store 变化时同步）', () => {
    const store = useDictStore()
    const { options } = useDict('user_status')

    expect(options.value).toEqual([])

    store.dicts['user_status'] = [{ value: 'a', label: 'A' }]
    expect(options.value).toEqual([{ value: 'a', label: 'A' }])
  })

  it('getLabel 命中', () => {
    const store = useDictStore()
    store.dicts['user_status'] = [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '禁用' },
    ]
    const { getLabel } = useDict('user_status')

    expect(getLabel('active')).toBe('启用')
    expect(getLabel('inactive')).toBe('禁用')
  })

  it('getLabel 未命中兜底 String(value)', () => {
    const store = useDictStore()
    store.dicts['user_status'] = [{ value: 'active', label: '启用' }]
    const { getLabel } = useDict('user_status')

    expect(getLabel('unknown')).toBe('unknown')
    expect(getLabel(null)).toBe('')
    expect(getLabel(undefined)).toBe('')
    expect(getLabel(0)).toBe('0') // value 是 number 时兜底为 String(value)
  })

  it('refresh 强制刷新', async () => {
    const data1 = [{ value: 'a', label: 'A' }]
    const data2 = [{ value: 'a', label: 'A-updated' }]
    mockedGetByType.mockResolvedValueOnce(data1).mockResolvedValueOnce(data2)
    const store = useDictStore()

    const { refresh, options } = useDict('user_status')
    await store.fetchDict('user_status')
    expect(options.value).toEqual(data1)

    await refresh()
    expect(options.value).toEqual(data2)
    expect(mockedGetByType).toHaveBeenCalledTimes(2)
  })
})
