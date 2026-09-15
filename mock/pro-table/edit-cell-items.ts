/**
 * ProTableEditCellVModel demo —— 商品 mock（演示 updateEvent='input' vs 'blur' 两种触发时机）
 *
 * mock 数据：30 条商品，含名称/数量/备注三种字段（input / input-number / input）
 */
import type { ProTableRequestApi, ProTableResponse } from '@/components/ProTable/types'

interface Item {
  id: number
  name: string
  quantity: number
  note: string
}

const ALL_MOCK: Item[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `商品-${i + 1}`,
  quantity: 100 + (i % 50),
  note: `备注-${i + 1}`,
}))

export const editCellItemsRequestApi: ProTableRequestApi<Item> = async (params) => {
  await new Promise((r) => setTimeout(r, 300))
  const pageNum = Number(params['pageNum'] ?? 1)
  const pageSize = Number(params['pageSize'] ?? 10)
  const start = (pageNum - 1) * pageSize
  const data: Item[] = ALL_MOCK.slice(start, start + pageSize)
  const response: ProTableResponse<Item> = {
    data,
    total: ALL_MOCK.length,
    pageNum,
    pageSize,
  }
  return response
}

/** 模拟保存接口（演示 onSave 触发） */
export const saveItemApi = async (row: Record<string, unknown>): Promise<boolean> => {
  await new Promise((r) => setTimeout(r, 300))
  // eslint-disable-next-line no-console
  console.info('[CCDemo] saveItem', row)
  return true
}
