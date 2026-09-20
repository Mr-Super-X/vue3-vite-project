import { describe, it, expect } from 'vitest'
import { SRC_DIR_ALIASES, resolveSrcDirAliases, generateTsconfigPaths } from './aliases'

describe('SRC_DIR_ALIASES', () => {
  it('包含 15 个别名（@ + 14 个 @xxx）', () => {
    expect(Object.keys(SRC_DIR_ALIASES)).toHaveLength(15)
  })

  it('@ 是空字符串（对应 src/ 根）', () => {
    expect(SRC_DIR_ALIASES['@']).toBe('')
  })

  it('@api → api（对应 src/api/）', () => {
    expect(SRC_DIR_ALIASES['@api']).toBe('api')
  })
})

describe('resolveSrcDirAliases', () => {
  it('返回 15 条 vite resolve.alias 形态', () => {
    const result = resolveSrcDirAliases()
    expect(Object.keys(result)).toHaveLength(15)
  })

  it('@ 解析为 ./src 绝对路径', () => {
    const result = resolveSrcDirAliases()
    expect(result['@']).toMatch(/[/\\]src$/)
  })

  it('@api 解析为 ./src/api 绝对路径', () => {
    const result = resolveSrcDirAliases()
    expect(result['@api']).toMatch(/[/\\]src[/\\]api$/)
  })
})

describe('generateTsconfigPaths', () => {
  it('返回 29 条（@/* + 14 × 2 条 = 28 + 1 catch-all）', () => {
    const paths = generateTsconfigPaths()
    expect(Object.keys(paths)).toHaveLength(29)
  })

  it('@/* → ./src/*', () => {
    expect(generateTsconfigPaths()['@/*']).toEqual(['./src/*'])
  })

  it('@api → ./src/api/index.ts；@api/* → ./src/api/*', () => {
    const paths = generateTsconfigPaths()
    expect(paths['@api']).toEqual(['./src/api/index.ts'])
    expect(paths['@api/*']).toEqual(['./src/api/*'])
  })
})
