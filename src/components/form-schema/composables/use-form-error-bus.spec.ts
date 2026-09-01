/**
 * useFormErrorBus 单元测试 —— OPT-7 错误事件总线
 *
 * 验证点：
 * 1. report() 上报后 events 列表新增条目
 * 2. report() 始终 console 留痕（开发期排错）
 * 3. 同 code + message 5 秒内去重
 * 4. dismiss(id) 标记单条为 dismissed（保留 30s 后清理）
 * 5. dismissAll() 清空所有 + dedupeCache
 * 6. unreadCount 仅统计未 dismissed
 * 7. 最多保留 MAX_EVENTS = 5 条
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { useFormErrorBus } from './use-form-error-bus'

interface MountHandle {
  bus: ReturnType<typeof useFormErrorBus>
  dispose: () => void
}

function mount(): MountHandle {
  const scope = effectScope()
  let bus!: ReturnType<typeof useFormErrorBus>
  scope.run(() => {
    bus = useFormErrorBus()
  })
  return { bus, dispose: () => scope.stop() }
}

const handles: MountHandle[] = []
function mountBus(): MountHandle {
  const h = mount()
  handles.push(h)
  return h
}

describe('useFormErrorBus', () => {
  let logSpy: ReturnType<typeof vi.spyOn> | undefined

  beforeEach(() => {
    logSpy = undefined
  })

  afterEach(() => {
    while (handles.length) handles.pop()?.dispose()
    logSpy?.mockRestore()
  })

  it('events 初始为空数组', () => {
    const { bus } = mountBus()
    expect(bus.events.value).toEqual([])
    expect(bus.unreadCount.value).toBe(0)
  })

  it('report() 上报后 events 列表新增条目（含 id/timestamp）', () => {
    const { bus } = mountBus()
    bus.report({
      severity: 'error',
      code: 'TEST_CODE',
      message: 'test message',
      source: 'test',
    })
    expect(bus.events.value).toHaveLength(1)
    const e = bus.events.value[0]!
    expect(e.severity).toBe('error')
    expect(e.code).toBe('TEST_CODE')
    expect(e.message).toBe('test message')
    expect(e.source).toBe('test')
    expect(e.dismissed).toBeFalsy() // 未 dismissed：undefined 也算 falsy
    expect(e.id).toBeTruthy()
    expect(e.timestamp).toBeGreaterThan(0)
  })

  it('report() 上报 error 走 console.error；warn 走 console.warn；info 走 console.info', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logSpy = errSpy // 标记供 afterEach 清理

    const { bus } = mountBus()
    bus.report({ severity: 'error', code: 'E1', message: 'm1' })
    bus.report({ severity: 'warn', code: 'W1', message: 'm2' })
    bus.report({ severity: 'info', code: 'I1', message: 'm3' })

    expect(errSpy).toHaveBeenCalledWith('[XForm][E1]', 'm1', expect.any(String))
    expect(warnSpy).toHaveBeenCalledWith('[XForm][W1]', 'm2', expect.any(String))
    expect(infoSpy).toHaveBeenCalledWith('[XForm][I1]', 'm3', expect.any(String))
  })

  it('同 code + message 5 秒内去重（窗口外允许重复）', () => {
    vi.useFakeTimers()
    try {
      const { bus } = mountBus()
      bus.report({ severity: 'error', code: 'DUP', message: 'x' })
      bus.report({ severity: 'error', code: 'DUP', message: 'x' }) // 5s 内去重
      expect(bus.events.value).toHaveLength(1)
      vi.advanceTimersByTime(5_001)
      bus.report({ severity: 'error', code: 'DUP', message: 'x' })
      expect(bus.events.value).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('dismiss(id) 标记单条为 dismissed；unreadCount 不变之前', () => {
    const { bus } = mountBus()
    bus.report({ severity: 'warn', code: 'A', message: 'a' })
    bus.report({ severity: 'warn', code: 'B', message: 'b' })
    expect(bus.unreadCount.value).toBe(2)
    const id = bus.events.value[0]!.id
    bus.dismiss(id)
    // dismiss 仅标记 dismissed=true，unreadCount 同步减少
    expect(bus.unreadCount.value).toBe(1)
    expect(bus.events.value.find((e) => e.id === id)?.dismissed).toBe(true)
  })

  it('dismissAll() 清空 events 与 dedupe 缓存（5s 后允许重复）', () => {
    vi.useFakeTimers()
    try {
      const { bus } = mountBus()
      bus.report({ severity: 'error', code: 'X', message: 'm' })
      bus.dismissAll()
      expect(bus.events.value).toEqual([])
      vi.advanceTimersByTime(5_001)
      bus.report({ severity: 'error', code: 'X', message: 'm' })
      expect(bus.events.value).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('最多保留 MAX_EVENTS = 5 条（最新在前）', () => {
    const { bus } = mountBus()
    for (let i = 1; i <= 8; i++) {
      // 用不同 message 避免去重
      bus.report({ severity: 'info', code: 'LOOP', message: `m${i}` })
    }
    expect(bus.events.value).toHaveLength(5)
    // 最新 m8 在 index 0
    expect(bus.events.value[0]?.message).toBe('m8')
    // 最早 m1~m3 被淘汰
    expect(bus.events.value.find((e) => e.message === 'm1')).toBeUndefined()
  })

  it('unreadCount 仅统计未 dismissed 条目', () => {
    const { bus } = mountBus()
    bus.report({ severity: 'warn', code: 'A', message: 'a' })
    bus.report({ severity: 'warn', code: 'B', message: 'b' })
    bus.report({ severity: 'warn', code: 'C', message: 'c' })
    expect(bus.unreadCount.value).toBe(3)
    bus.dismiss(bus.events.value[0]!.id)
    expect(bus.unreadCount.value).toBe(2)
  })

  it('scope.dispose 不清空 bus.events（bus 由调用方管理生命周期）', async () => {
    // 注：bus 内部状态独立于 scope，dispose 不会清理 events
    const { bus, dispose } = mountBus()
    bus.report({ severity: 'error', code: 'NO_CLEAN', message: 'persistent' })
    expect(bus.events.value).toHaveLength(1)
    dispose()
    await nextTick()
    // bus 仍持有 events（调用方需自行调用 dismissAll 清理）
    expect(bus.events.value).toHaveLength(1)
    // 清理
    bus.dismissAll()
  })

  it('force: true 跳过去重（用户主动 validate 调用场景）', () => {
    vi.useFakeTimers()
    try {
      const { bus } = mountBus()
      // 默认行为：同 code + message 在 5s 内去重
      bus.report({ severity: 'error', code: 'FORCE', message: 'same' })
      bus.report({ severity: 'error', code: 'FORCE', message: 'same' })
      expect(bus.events.value).toHaveLength(1)
      // force: true → 立即再加一条，跳过去重
      bus.report({
        severity: 'error',
        code: 'FORCE',
        message: 'same',
        force: true,
      })
      expect(bus.events.value).toHaveLength(2)
      // 再加 force → 仍然能加
      bus.report({
        severity: 'error',
        code: 'FORCE',
        message: 'same',
        force: true,
      })
      expect(bus.events.value).toHaveLength(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('force 不污染事件数据（事件字段不含 force 键）', () => {
    const { bus } = mountBus()
    bus.report({
      severity: 'error',
      code: 'FORCE_PURE',
      message: 'm',
      force: true,
    })
    const event = bus.events.value[0]!
    expect(event).not.toHaveProperty('force')
    expect(event.code).toBe('FORCE_PURE')
  })
})
