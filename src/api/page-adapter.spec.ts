import { describe, it, expect } from 'vitest'
import {
  adaptBackendPage,
  buildBackendPageQuery,
  type PageQueryFieldMap,
  type PageResponseFieldMap,
} from './page-adapter'

describe('adaptBackendPage（默认 v2 字段）', () => {
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

describe('adaptBackendPage（自定义字段映射）', () => {
  it('团队 B 后端：list / page / pageSize / total_records', () => {
    const fieldMap: PageResponseFieldMap = {
      listField: 'list',
      pageField: 'page',
      pageSizeField: 'pageSize',
      totalField: 'total_records',
    }
    const raw = {
      list: [{ id: 1 }],
      page: 2,
      pageSize: 20,
      total_records: 100,
    }
    expect(adaptBackendPage(raw, fieldMap)).toEqual({
      list: [{ id: 1 }],
      total: 100,
      page: 2,
      pageSize: 20,
    })
  })

  it('部分覆盖字段映射：只改 listField，其他走默认', () => {
    const raw = {
      data: [{ id: 1 }], // 用 data 字段
      records: [{ id: 99 }], // 默认字段也存在但被忽略
      total: 5,
      size: 10,
      current: 1,
    }
    const result = adaptBackendPage(raw, { listField: 'data' })
    expect(result.list).toEqual([{ id: 1 }])
    expect(result.total).toBe(5)
  })

  it('字段缺失走默认：total 缺失 → 0', () => {
    const raw = {
      records: [{ id: 1 }],
      size: 10,
      current: 1,
      // total 缺失
    }
    expect(adaptBackendPage(raw).total).toBe(0)
  })

  it('字段缺失走默认：records 缺失 → 空数组', () => {
    const raw = { total: 5, size: 10, current: 1 }
    expect(adaptBackendPage(raw).list).toEqual([])
  })
})

describe('buildBackendPageQuery（默认 v2 字段）', () => {
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

describe('buildBackendPageQuery（自定义字段映射）', () => {
  it('团队 B 后端：pageField=p', () => {
    expect(buildBackendPageQuery({ page: 2, pageSize: 20 }, { pageField: 'p' })).toEqual({
      p: 2,
      pageSize: 20,
    })
  })

  it('团队 C 后端：pageSizeField=size', () => {
    expect(buildBackendPageQuery({ page: 1, pageSize: 50 }, { pageSizeField: 'size' })).toEqual({
      pageIndex: 1,
      size: 50,
    })
  })

  it('团队 D 后端：两个字段都改', () => {
    const fieldMap: PageQueryFieldMap = {
      pageField: 'p',
      pageSizeField: 'limit',
    }
    expect(buildBackendPageQuery({ page: 3, pageSize: 15 }, fieldMap)).toEqual({
      p: 3,
      limit: 15,
    })
  })
})
