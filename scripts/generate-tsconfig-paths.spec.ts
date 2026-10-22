import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { aliasesToTsconfigPaths, generateTsconfigContent } from './generate-tsconfig-paths'

describe('generateTsconfigContent', () => {
  it('输入基础 base.json + paths 对象，输出完整 tsconfig.app.json 字符串', () => {
    const base = {
      extends: './tsconfig.app.base.json',
      compilerOptions: {},
    }
    const paths = {
      '@/*': ['./src/*'],
      '@api': ['./src/api/index.ts'],
      '@api/*': ['./src/api/*'],
    }
    const result = generateTsconfigContent(base, paths)

    expect(result).toContain('"extends": "./tsconfig.app.base.json"')
    expect(result).toContain('"paths"')
    expect(result).toContain('"@/*"')
    expect(result).toContain('"./src/*"')
  })

  it('保留 base 中其他 compilerOptions 字段', () => {
    const base = {
      extends: './tsconfig.app.base.json',
      compilerOptions: { noEmit: true },
    }
    const result = generateTsconfigContent(base, { '@/*': ['./src/*'] })

    expect(result).toContain('"noEmit": true')
    expect(result).toContain('"paths"')
  })

  it('paths 按 key 字母序排序（保证 git diff 稳定）', () => {
    const base = { extends: './base.json', compilerOptions: {} }
    const paths = { '@z/*': ['./src/z/*'], '@a/*': ['./src/a/*'] }
    const result = generateTsconfigContent(base, paths)

    const aIndex = result.indexOf('"@a/*"')
    const zIndex = result.indexOf('"@z/*"')
    expect(aIndex).toBeLessThan(zIndex)
  })
})

describe('aliasesToTsconfigPaths', () => {
  const appRoot = path.join('D:', 'proj', 'apps', 'admin')

  it("@ 只生成 '@/*'（catch-all），不生成 bare '@'", () => {
    const paths = aliasesToTsconfigPaths({ '@': path.join(appRoot, 'src') }, appRoot)
    expect(paths).toEqual({ '@/*': ['./src/*'] })
  })

  it('常规别名生成 bare（index.ts）+ /* 两条', () => {
    const paths = aliasesToTsconfigPaths({ '@api': path.join(appRoot, 'src/api') }, appRoot)
    expect(paths['@api']).toEqual(['./src/api/index.ts'])
    expect(paths['@api/*']).toEqual(['./src/api/*'])
  })

  it('appRoot 之外的路径输出上探形态（@mock → ../../mock，P0-2 手修语义必须保留）', () => {
    const mockDir = path.join('D:', 'proj', 'mock')
    const paths = aliasesToTsconfigPaths({ '@mock': mockDir }, appRoot)
    expect(paths['@mock']).toEqual(['../../mock/index.ts'])
    expect(paths['@mock/*']).toEqual(['../../mock/*'])
  })
})
