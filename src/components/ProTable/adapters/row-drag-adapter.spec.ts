/**
 * RowDragAdapter 单元测试（v3.5 PR1-B Task 4）—— 验证 RowDragAdapter 接口契约
 * 与 elementPlusRowDragAdapter 实现。
 *
 * vxeRowDragAdapter 在 Task 5 追加。
 *
 * @group ProTable adapters 测试
 */
import { describe, it, expect } from 'vitest'
import {
  createElementPlusRowDragAdapter,
  EL_TABLE_TBODY_SELECTOR,
  EL_TABLE_ROW_KEY_ATTR,
  EL_TABLE_ROW_LEVEL_ATTR,
  type RowDragAdapter,
} from './row-drag-adapter'

describe('RowDragAdapter (elementPlusRowDragAdapter)', () => {
  describe('常量导出', () => {
    it('EL_TABLE_TBODY_SELECTOR 选择器与 ElementTableBody DOM 结构一致', () => {
      // 必须与 ElementTableBody 模板实际生成的 tbody DOM 选择器匹配
      expect(EL_TABLE_TBODY_SELECTOR).toBe('.el-table__body-wrapper tbody')
    })
    it('EL_TABLE_ROW_KEY_ATTR 行 rowKey 属性名与 ElementTableBody 一致', () => {
      expect(EL_TABLE_ROW_KEY_ATTR).toBe('data-row-key')
    })
    it('EL_TABLE_ROW_LEVEL_ATTR 行层级属性名与 ElementTableBody 一致', () => {
      expect(EL_TABLE_ROW_LEVEL_ATTR).toBe('data-level')
    })
  })

  describe('createElementPlusRowDragAdapter', () => {
    it('getTbody 返回当前 el-table tbody（jsdom 下为空，无 .el-table__body-wrapper）', () => {
      const adapter = createElementPlusRowDragAdapter()
      expect(adapter.getTbody()).toBeNull()
    })

    it('getTbody 在挂载 .el-table__body-wrapper tbody 后返回该元素', () => {
      // 临时挂 DOM：模拟 el-table 渲染产物
      const wrap = document.createElement('div')
      wrap.className = 'el-table__body-wrapper'
      const tbody = document.createElement('tbody')
      wrap.appendChild(tbody)
      document.body.appendChild(wrap)

      const adapter = createElementPlusRowDragAdapter()
      const got = adapter.getTbody()
      expect(got).toBe(tbody)

      document.body.removeChild(wrap)
    })

    it('extractRowKey 从 data-row-key 属性读取（字符串原样返回）', () => {
      const adapter = createElementPlusRowDragAdapter('orderNo')
      const row = document.createElement('tr')
      row.setAttribute('data-row-key', 'abc-123')
      expect(adapter.extractRowKey(row)).toBe('abc-123')
    })

    it('extractRowKey rowKey="id" 时数字字符串转回 number', () => {
      // 与 useTable.data 行 key 类型一致：业务 row.id 为数字时 adapter 还原 1 而非 "1"
      const adapter = createElementPlusRowDragAdapter('id')
      const row = document.createElement('tr')
      row.setAttribute('data-row-key', '42')
      expect(adapter.extractRowKey(row)).toBe(42)
    })

    it('extractRowKey 属性缺失返回 null（useRowDrag 走 console.warn + 跳过）', () => {
      const adapter = createElementPlusRowDragAdapter()
      const row = document.createElement('tr')
      expect(adapter.extractRowKey(row)).toBeNull()
    })

    it('extractRowKey 属性为空字符串返回 null', () => {
      const adapter = createElementPlusRowDragAdapter()
      const row = document.createElement('tr')
      row.setAttribute('data-row-key', '')
      expect(adapter.extractRowKey(row)).toBeNull()
    })

    it('getRowLevel 从 data-level 属性读取数字', () => {
      const adapter = createElementPlusRowDragAdapter()
      const row = document.createElement('tr')
      row.setAttribute('data-level', '2')
      expect(adapter.getRowLevel?.(row)).toBe(2)
    })

    it('getRowLevel 缺失或非数字返回 null', () => {
      const adapter = createElementPlusRowDragAdapter()
      const row = document.createElement('tr')
      expect(adapter.getRowLevel?.(row)).toBeNull()
      row.setAttribute('data-level', '')
      expect(adapter.getRowLevel?.(row)).toBeNull()
    })

    it('满足 RowDragAdapter 接口契约（duck typing 3 方法签名）', () => {
      const a: RowDragAdapter = createElementPlusRowDragAdapter()
      expect(typeof a.getTbody).toBe('function')
      expect(typeof a.extractRowKey).toBe('function')
      // getRowLevel 可选；存在时 typeof 校验
      expect(a.getRowLevel === undefined || typeof a.getRowLevel === 'function').toBe(true)
    })
  })
})
