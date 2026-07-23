import { describe, it, expect } from 'vitest'
import { COMPONENT_REGISTRY } from './auto-register'

describe('COMPONENT_REGISTRY（从 autoRegisteredRoutes 派生）', () => {
  it('含 routes/index.ts 中声明的所有业务路由 name', () => {
    expect(COMPONENT_REGISTRY.Login).toBeDefined()
    expect(COMPONENT_REGISTRY.Home).toBeDefined()
    expect(COMPONENT_REGISTRY.UserList).toBeDefined()
  })

  it('含 error 模块的所有 name', () => {
    expect(COMPONENT_REGISTRY.Forbidden).toBeDefined()
    expect(COMPONENT_REGISTRY.NotFound).toBeDefined()
    expect(COMPONENT_REGISTRY.ServerError).toBeDefined()
  })

  it('component 是懒加载函数（不会立即执行）', () => {
    expect(typeof COMPONENT_REGISTRY.Login).toBe('function')
  })

  it('不包含未在 routes 中声明的 name', () => {
    expect(COMPONENT_REGISTRY.NonExistentRoute).toBeUndefined()
  })
})
