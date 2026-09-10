import { describe, it, expect } from 'vitest'
import { VENDOR_CHUNKS } from './vendor-chunks'

describe('VENDOR_CHUNKS', () => {
  it('包含 vendor-vue / vendor-ui / vendor-charts 三组', () => {
    const names = VENDOR_CHUNKS.map((c) => c.name)
    expect(names).toEqual(['vendor-vue', 'vendor-ui', 'vendor-charts'])
  })

  it('顺序敏感：vue → ui → charts（先匹配先返回）', () => {
    expect(VENDOR_CHUNKS[0].name).toBe('vendor-vue')
    expect(VENDOR_CHUNKS[1].name).toBe('vendor-ui')
    expect(VENDOR_CHUNKS[2].name).toBe('vendor-charts')
  })

  it('vendor-vue 包含 vue / pinia / @vue 三个 pattern', () => {
    expect(VENDOR_CHUNKS[0].patterns).toEqual(['/vue/', '/pinia/', '/@vue/'])
  })

  it('vendor-ui 包含 element-plus / unplugin-vue-components', () => {
    expect(VENDOR_CHUNKS[1].patterns).toEqual(['/element-plus/', '/unplugin-vue-components/'])
  })

  it('vendor-charts 包含 echarts（echarts 包体大，单拆利于缓存命中）', () => {
    expect(VENDOR_CHUNKS[2].name).toBe('vendor-charts')
    expect(VENDOR_CHUNKS[2].patterns).toEqual(['/echarts/'])
  })
})
