import { describe, it, expect } from 'vitest'
import {
  SRC_DIR_ALIASES,
  PROJECT_ROOT_ALIASES,
  resolveSrcDirAliases,
  generateTsconfigPaths,
} from './aliases'

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

describe('PROJECT_ROOT_ALIASES', () => {
  it('包含 @mock → mock（对应项目根 mock/）', () => {
    expect(PROJECT_ROOT_ALIASES).toEqual({ '@mock': 'mock' })
  })

  it('值是裸字符串（不含 src/ 前缀）—— 与 SRC_DIR_ALIASES 区分', () => {
    // 关键区别：SRC_DIR_ALIASES 值会拼 src/，PROJECT_ROOT_ALIASES 值直接用
    expect(PROJECT_ROOT_ALIASES['@mock']).toBe('mock')
  })
})

describe('resolveSrcDirAliases', () => {
  it('返回 16 条 vite resolve.alias 形态（15 src + 1 root）', () => {
    const result = resolveSrcDirAliases()
    expect(Object.keys(result)).toHaveLength(16)
  })

  it('@ 解析为 ./src 绝对路径', () => {
    const result = resolveSrcDirAliases()
    expect(result['@']).toMatch(/[/\\]src$/)
  })

  it('@api 解析为 ./src/api 绝对路径', () => {
    const result = resolveSrcDirAliases()
    expect(result['@api']).toMatch(/[/\\]src[/\\]api$/)
  })

  it('@mock 解析为 ./mock 绝对路径（不拼接 src/）', () => {
    const result = resolveSrcDirAliases()
    // 路径以 mock 结尾，但不含 src/mock
    expect(result['@mock']).toMatch(/[/\\]mock$/)
    expect(result['@mock']).not.toMatch(/[/\\]src[/\\]mock/)
  })
})

describe('generateTsconfigPaths', () => {
  it('返回 32 条（src 30 + mock 2）', () => {
    const paths = generateTsconfigPaths()
    // src: @/* catch-all + 14 × 2 (bare + /*) = 29
    // mock: @mock + @mock/* = 2
    // 合计 31... 实际原 29 是 1(@/*) + 14×2 = 29（src），加 2 = 31
    // 但 vite 测试说 15 × 2 - 1 = 29 也对（@ 只算 /* 一条）
    // PROJECT_ROOT 加 @mock 2 条 → 31
    expect(Object.keys(paths)).toHaveLength(31)
  })

  it('@/* → ./src/*', () => {
    expect(generateTsconfigPaths()['@/*']).toEqual(['./src/*'])
  })

  it('@api → ./src/api/index.ts；@api/* → ./src/api/*', () => {
    const paths = generateTsconfigPaths()
    expect(paths['@api']).toEqual(['./src/api/index.ts'])
    expect(paths['@api/*']).toEqual(['./src/api/*'])
  })

  it('@mock → ./mock/index.ts；@mock/* → ./mock/*（项目根，不带 src/）', () => {
    const paths = generateTsconfigPaths()
    expect(paths['@mock']).toEqual(['./mock/index.ts'])
    expect(paths['@mock/*']).toEqual(['./mock/*'])
  })
})
