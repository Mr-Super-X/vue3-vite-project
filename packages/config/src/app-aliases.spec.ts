import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MOCK_ROOT_DIR,
  SHARED_SRC_DIR,
  UI_SRC_DIR,
  createAppAliases,
  resolvePkgFirst,
} from './app-aliases'

// existsSync 默认走真实实现；仅在「包已落地」分支用例里 mockReturnValue(true)
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, existsSync: vi.fn(actual.existsSync) }
})
const mockedExistsSync = vi.mocked(fs.existsSync)
const realExistsSync = (await vi.importActual<typeof import('node:fs')>('node:fs')).existsSync

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const APP_ROOT = path.join(REPO_ROOT, 'apps/admin')

afterEach(() => {
  mockedExistsSync.mockReset()
  mockedExistsSync.mockImplementation(realExistsSync)
})

describe('createAppAliases', () => {
  it('返回 16 条别名（@ + 8 shared + 2 ui + @mock + 4 app 私有）', () => {
    expect(Object.keys(createAppAliases(APP_ROOT, APP_ROOT))).toHaveLength(16)
  })

  it('@ 与 app 私有别名指向 app 自身 src', () => {
    const aliases = createAppAliases(APP_ROOT, APP_ROOT)
    expect(aliases['@']).toBe(path.join(APP_ROOT, 'src'))
    expect(aliases['@modules']).toBe(path.join(APP_ROOT, 'src/modules'))
    expect(aliases['@layouts']).toBe(path.join(APP_ROOT, 'src/layouts'))
    expect(aliases['@router']).toBe(path.join(APP_ROOT, 'src/router'))
    expect(aliases['@plugins']).toBe(path.join(APP_ROOT, 'src/plugins'))
  })

  it('@mock 恒指仓库根 mock/（P1-2 迁入 @vv/mock 前不随包切换）', () => {
    expect(createAppAliases(APP_ROOT, APP_ROOT)['@mock']).toBe(path.join(REPO_ROOT, 'mock'))
    expect(MOCK_ROOT_DIR).toBe(path.join(REPO_ROOT, 'mock'))
  })

  it('过渡态回落：packages/shared、packages/ui 不存在时指向 legacyRoot 对应子目录', () => {
    // 真实 fs：packages/shared、packages/ui 在 P1-3/P1-4 前不存在
    const aliases = createAppAliases(APP_ROOT, APP_ROOT)
    expect(aliases['@api']).toBe(path.join(APP_ROOT, 'src/api'))
    expect(aliases['@utils']).toBe(path.join(APP_ROOT, 'src/utils'))
    expect(aliases['@components']).toBe(path.join(APP_ROOT, 'src/components'))
    expect(aliases['@assets']).toBe(path.join(APP_ROOT, 'src/assets'))
  })

  it('缺省 legacyRoot：包目录不存在也指包路径（由调用方保证包已落地）', () => {
    const aliases = createAppAliases(APP_ROOT)
    expect(aliases['@api']).toBe(path.join(SHARED_SRC_DIR, 'api'))
    expect(aliases['@components']).toBe(path.join(UI_SRC_DIR, 'components'))
  })

  it('包目录已落地（existsSync 命中）→ 优先指包源码，legacyRoot 被忽略', () => {
    mockedExistsSync.mockReturnValue(true)
    const aliases = createAppAliases(APP_ROOT, APP_ROOT)
    expect(aliases['@api']).toBe(path.join(SHARED_SRC_DIR, 'api'))
    expect(aliases['@store']).toBe(path.join(SHARED_SRC_DIR, 'store'))
    expect(aliases['@components']).toBe(path.join(UI_SRC_DIR, 'components'))
  })
})

describe('resolvePkgFirst', () => {
  it('包目录存在 → 返回包目录', () => {
    mockedExistsSync.mockReturnValue(true)
    expect(resolvePkgFirst('/pkg/x', '/legacy/x')).toBe('/pkg/x')
  })

  it('包目录不存在 → 返回 legacy 目录', () => {
    mockedExistsSync.mockReturnValue(false)
    expect(resolvePkgFirst('/pkg/x', '/legacy/x')).toBe('/legacy/x')
  })

  it('包目录不存在且无 legacy → 返回包目录（保持指包语义）', () => {
    mockedExistsSync.mockReturnValue(false)
    expect(resolvePkgFirst('/pkg/x')).toBe('/pkg/x')
  })
})
