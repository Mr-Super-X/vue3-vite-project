// dict store 单测
//
// 覆盖：
//   - fetchDict：首次发请求 / 5min 缓存命中 / force 强制刷新 / 并发去重
//   - getLabel：命中 / 未命中 / null undefined
//   - preloadDict：批量拉取 PRELOAD_DICT_KEYS / 自定义 types
//   - clear：清空所有缓存

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock dictApi（在导入 useDictStore 之前）
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

import { dictApi, type DictEntry } from '@/api/modules/dict'
import { useDictStore, PRELOAD_DICT_KEYS } from './dict'

const mockedGetByType = dictApi.getByType as unknown as ReturnType<typeof vi.fn>

describe('useDictStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedGetByType.mockReset()
  })

  describe('fetchDict', () => {
    it('首次调用发请求 + 写入缓存 + 记录时间戳', async () => {
      const data: DictEntry[] = [{ value: 'a', label: 'A' }]
      mockedGetByType.mockResolvedValueOnce(data)

      const store = useDictStore()
      const result = await store.fetchDict('user_status')

      expect(result).toEqual(data)
      expect(store.dicts['user_status']).toEqual(data)
      expect(store.lastFetchAt['user_status']).toBeGreaterThan(0)
      expect(mockedGetByType).toHaveBeenCalledTimes(1)
    })

    it('同一类型 5min 内复用缓存（不重复请求）', async () => {
      const data = [{ value: 'a', label: 'A' }]
      mockedGetByType.mockResolvedValueOnce(data)

      const store = useDictStore()
      await store.fetchDict('user_status')
      await store.fetchDict('user_status')
      await store.fetchDict('user_status')

      expect(mockedGetByType).toHaveBeenCalledTimes(1)
    })

    it('force=true 强制刷新', async () => {
      const data1 = [{ value: 'a', label: 'A' }]
      const data2 = [{ value: 'a', label: 'A-updated' }]
      mockedGetByType.mockResolvedValueOnce(data1).mockResolvedValueOnce(data2)

      const store = useDictStore()
      await store.fetchDict('user_status')
      const result = await store.fetchDict('user_status', true)

      expect(mockedGetByType).toHaveBeenCalledTimes(2)
      expect(result).toEqual(data2)
      expect(store.dicts['user_status']).toEqual(data2)
    })

    it('并发调用同一字典只发一次请求', async () => {
      const data: DictEntry[] = [{ value: 'a', label: 'A' }]
      let resolve!: (val: DictEntry[]) => void
      mockedGetByType.mockReturnValueOnce(
        new Promise<DictEntry[]>((r) => {
          resolve = r
        })
      )

      const store = useDictStore()
      const p1 = store.fetchDict('x')
      const p2 = store.fetchDict('x')
      const p3 = store.fetchDict('x')

      resolve(data)
      await Promise.all([p1, p2, p3])

      expect(mockedGetByType).toHaveBeenCalledTimes(1)
    })

    it('请求失败抛错且 loading 状态被清理', async () => {
      mockedGetByType.mockRejectedValueOnce(new Error('network'))

      const store = useDictStore()
      await expect(store.fetchDict('x')).rejects.toThrow('network')
      expect(store.loading.has('x')).toBe(false)
    })
  })

  describe('getLabel', () => {
    it('命中已加载字典', () => {
      const store = useDictStore()
      store.dicts['user_status'] = [
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '禁用' },
      ]

      expect(store.getLabel('user_status', 'active')).toBe('启用')
      expect(store.getLabel('user_status', 'inactive')).toBe('禁用')
    })

    it('未命中返回 String(value) 兜底', () => {
      const store = useDictStore()
      expect(store.getLabel('user_status', 'ghost')).toBe('ghost')
    })

    it('null / undefined 返回空串', () => {
      const store = useDictStore()
      expect(store.getLabel('user_status', null)).toBe('')
      expect(store.getLabel('user_status', undefined)).toBe('')
    })

    it('type 字典未加载（未调过 fetchDict）也走兜底', () => {
      const store = useDictStore()
      expect(store.getLabel('user_status', 'active')).toBe('active')
    })
  })

  describe('preloadDict', () => {
    it('批量拉取 PRELOAD_DICT_KEYS', async () => {
      mockedGetByType.mockResolvedValue([])
      const store = useDictStore()
      await store.preloadDict()

      expect(mockedGetByType).toHaveBeenCalledTimes(PRELOAD_DICT_KEYS.length)
    })

    it('支持自定义 types 列表', async () => {
      mockedGetByType.mockResolvedValue([])
      const store = useDictStore()
      await store.preloadDict(['custom_a', 'custom_b'])

      expect(mockedGetByType).toHaveBeenCalledTimes(2)
      expect(mockedGetByType).toHaveBeenCalledWith('custom_a')
      expect(mockedGetByType).toHaveBeenCalledWith('custom_b')
    })
  })

  describe('clear', () => {
    it('清空所有缓存', () => {
      const store = useDictStore()
      store.dicts['user_status'] = [{ value: 'a', label: 'A' }]
      store.lastFetchAt['user_status'] = Date.now()

      store.clear()

      expect(store.dicts).toEqual({})
      expect(store.lastFetchAt).toEqual({})
    })
  })
})
