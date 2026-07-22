import { describe, it, expect } from 'vitest'
import { adaptBackendPage, buildBackendPageQuery } from './page-adapter'

describe('adaptBackendPage', () => {
  it('records/current/size 映射到 Pagination 字段', () => {
    const raw = {
      records: [{ id: 1 }, { id: 2 }],
      total: 10,
      size: 2,
      current: 3,
    }
    expect(adaptBackendPage(raw)).toEqual({
      list: [{ id: 1 }, { id: 2 }],
      total: 10,
      page: 3,
      pageSize: 2,
    })
  })

  it('空 records 也正确处理', () => {
    expect(adaptBackendPage({ records: [], total: 0, size: 10, current: 1 })).toEqual({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })
  })

  it('pages 字段被忽略（不影响适配结果）', () => {
    const raw = {
      records: [{ id: 1 }],
      total: 1,
      size: 10,
      current: 1,
      pages: 1,
    }
    const { pages: _ignored, ...rest } = raw
    expect(adaptBackendPage(rest)).toEqual({
      list: [{ id: 1 }],
      total: 1,
      page: 1,
      pageSize: 10,
    })
  })

  it('records 内部对象类型透传（泛型 T）', () => {
    interface Item {
      id: number
      name: string
    }
    const raw = {
      records: [{ id: 1, name: 'a' }],
      total: 1,
      size: 10,
      current: 1,
    }
    const result = adaptBackendPage<Item>(raw)
    expect(result.list[0]?.name).toBe('a')
  })
})

describe('buildBackendPageQuery', () => {
  it('page/pageSize 映射到 pageIndex/pageSize', () => {
    expect(buildBackendPageQuery({ page: 2, pageSize: 20 })).toEqual({
      pageIndex: 2,
      pageSize: 20,
    })
  })

  it('缺省值：page 默认 1，pageSize 默认 10', () => {
    expect(buildBackendPageQuery({})).toEqual({
      pageIndex: 1,
      pageSize: 10,
    })
  })

  it('只传 page（pageSize 走默认）', () => {
    expect(buildBackendPageQuery({ page: 5 })).toEqual({
      pageIndex: 5,
      pageSize: 10,
    })
  })

  it('只传 pageSize（page 走默认）', () => {
    expect(buildBackendPageQuery({ pageSize: 50 })).toEqual({
      pageIndex: 1,
      pageSize: 50,
    })
  })

  it('page=1 与后端 pageIndex=1 同义（无需 offset）', () => {
    expect(buildBackendPageQuery({ page: 1, pageSize: 10 }).pageIndex).toBe(1)
  })
})
