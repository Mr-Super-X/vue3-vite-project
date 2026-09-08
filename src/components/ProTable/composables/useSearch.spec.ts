/**
 * useSearch composable 单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 初始化填 defaultValue + initParam
 * 2) reset() 恢复 defaultValue + 清空用户输入
 * 3) serializeParams 剔除 undefined/null/''，保留 0/false（附录 A #10）
 * 4) getParams 返回当前 searchParams 快照
 * 5) setSearchParams 替换表单值 + 触发 fetchHook + 回到第 1 页
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useSearch } from './useSearch'

describe('useSearch', () => {
  const makeProps = () =>
    ({
      columns: [
        { prop: 'name', label: '名称', search: { el: 'input', defaultValue: '' } },
        { prop: 'status', label: '状态', search: { el: 'select', defaultValue: null } },
      ],
      initParam: { tenantId: 't1' },
    }) as never

  it('初始化时填入 defaultValue + initParam', () => {
    const engine = ref('element-plus' as const)
    const search = useSearch({ props: makeProps(), engine })
    expect(search.searchParams.value).toEqual({ tenantId: 't1', name: '', status: null })
  })

  it('reset() 恢复 defaultValue + 清空用户输入', async () => {
    const engine = ref('element-plus' as const)
    const search = useSearch({ props: makeProps(), engine })
    search.searchParams.value.name = '张三'
    await search.reset()
    expect(search.searchParams.value).toEqual({ tenantId: 't1', name: '', status: null })
  })

  it('serializeParams 剔除 undefined / null / 空字符串（保留 0/false）', () => {
    const engine = ref('element-plus' as const)
    const search = useSearch({ props: makeProps(), engine })
    const out = search.serializeParams({
      a: 1,
      b: 0,
      c: false,
      d: '',
      e: null,
      f: undefined,
      g: 'x',
    })
    expect(out).toEqual({ a: 1, b: 0, c: false, g: 'x' })
  })

  it('getParams 返回当前 searchParams 快照', () => {
    const engine = ref('element-plus' as const)
    const search = useSearch({ props: makeProps(), engine })
    expect(search.getParams()).toEqual({ tenantId: 't1', name: '', status: null })
  })

  it('setSearchParams 替换表单值', async () => {
    const engine = ref('element-plus' as const)
    const fetchHook = vi.fn()
    const search = useSearch({ props: makeProps(), engine, fetchHook })
    await search.setSearchParams({ name: '李四', status: 1 })
    expect(search.searchParams.value).toEqual({ name: '李四', status: 1, tenantId: 't1' })
    expect(fetchHook).toHaveBeenCalled()
  })

  it('updateParams 纯写参数且不触发 fetchHook（H2 修复：输入与请求解耦）', () => {
    const engine = ref('element-plus' as const)
    const fetchHook = vi.fn()
    const search = useSearch({ props: makeProps(), engine, fetchHook })
    search.updateParams({ name: '王五' })
    expect(search.searchParams.value).toEqual({ name: '王五', status: null, tenantId: 't1' })
    expect(fetchHook).not.toHaveBeenCalled()
  })
})
