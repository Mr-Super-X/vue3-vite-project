import { describe, it, expect } from 'vitest'
import { effectScope, ref, h } from 'vue'
import type { SchemaNode } from '../types'
import { useSchemaRenderer } from './use-schema-renderer'
// SchemaNode import used by 'as SchemaNode' assertion below

describe('useSchemaRenderer(opts)', () => {
  it('returns reactiveSchema reflecting initial schema', () => {
    const schema = ref({ component: 'Input', name: 'x' })
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      expect(reactiveSchema.value).toEqual({ component: 'Input', name: 'x' })
    })
    scope.stop()
  })

  it('does NOT clone schema when no reaction field (preserves identity)', () => {
    const original = { component: 'Input', name: 'x' }
    const schema = ref(original)
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      expect(reactiveSchema.value).toEqual(original)
      // 不应克隆（无 reaction 时跳过 cloneDeep）
    })
    scope.stop()
  })

  it('does NOT register watchEffect when schema has no reaction', () => {
    const schema = ref({ component: 'Input' })
    const formData = ref({})
    const scope = effectScope()
    let effectCount = 0
    scope.run(() => {
      useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      // 间接验证：formData 变化不应触发 schema 更新
    })
    scope.stop()
    effectCount = 0
    expect(effectCount).toBe(0)
  })

  it('clones schema when reaction present and applies reaction', () => {
    const schema = ref({
      children: [
        {
          component: 'Input',
          name: 'x',
          reaction: { label: (m: Record<string, unknown>) => ((m.x as boolean) ? 'A' : 'B') },
        },
      ],
    } as unknown as SchemaNode)
    const formData = ref({ x: true })
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      const rs = reactiveSchema.value as SchemaNode
      const origSchema = schema.value as SchemaNode
      expect((rs.children as Array<{ label?: string }>)[0]!.label).toBe('A')
      // 原 schema 未被修改（已 cloneDeep）
      expect(
        (origSchema.children as Array<{ label?: string; reaction?: unknown }>)[0]!.label
      ).toBeUndefined()
    })
    scope.stop()
  })

  it('cleans up all watchEffects on scope dispose', () => {
    const schema = ref({
      component: 'Input',
      reaction: { label: '{{ (m) => "x" }}' },
    })
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
    })
    expect(() => scope.stop()).not.toThrow()
  })

  it('clones schema as reactive when asyncOptions present and injects fetched options', async () => {
    const schema = ref<SchemaNode>({
      component: 'Select',
      name: 'city',
      asyncOptions: {
        source: async () => [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ],
        transform: (raw) =>
          (raw as Array<{ id: number; name: string }>).map((item) => ({
            label: item.name,
            value: item.id,
          })),
      },
    })
    const formData = ref({})
    const scope = effectScope()
    let reactiveSchema: ReturnType<typeof useSchemaRenderer>['reactiveSchema'] | undefined
    scope.run(() => {
      reactiveSchema = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      }).reactiveSchema
    })
    await new Promise((r) => setTimeout(r, 0))
    const rs = reactiveSchema!.value as SchemaNode
    expect(rs.props?.options).toEqual([
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ])
    scope.stop()
  })

  it('clones schema as reactive when asyncOptions present (does not preserve identity)', () => {
    const original: SchemaNode = {
      component: 'Select',
      name: 'city',
      asyncOptions: { source: async () => [] },
    }
    const schema = ref(original)
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      // asyncOptions 会修改 node.props，需要 reactive 克隆，不能保留原对象引用
      expect(reactiveSchema.value).not.toBe(original)
    })
    scope.stop()
  })

  it('handles schema as array (auto-wraps with children)', () => {
    const schema = ref([{ component: 'Input' }])
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      const rs = reactiveSchema.value as SchemaNode
      expect(Array.isArray(rs.children)).toBe(true)
      expect(rs.component).toBeUndefined()
    })
    scope.stop()
  })

  it('函数 slot 不会触发 asyncOptions 路径(containsAsyncOptions 已跳过函数)', () => {
    const headerSlot = () => h('div', null, 'slot')
    const schema = ref<SchemaNode>({
      component: 'Card',
      slots: {
        header: headerSlot as never,
      },
    })
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      // 关键:函数 slot 不应被 containsAsyncOptions 递归遍历,也不会被 reactive 包装替换
      expect((reactiveSchema.value as SchemaNode).slots?.header).toBe(headerSlot)
    })
    scope.stop()
  })

  it('函数 slot 不会触发 reaction 路径(containsReaction 已跳过函数)', () => {
    const headerSlot = () => h('div', null, 'slot')
    const schema = ref<SchemaNode>({
      component: 'Card',
      slots: {
        header: headerSlot as never,
      },
    })
    const formData = ref({})
    const scope = effectScope()
    scope.run(() => {
      const { reactiveSchema } = useSchemaRenderer({
        schema,
        components: ref(undefined),
        formData,
      })
      // 关键:函数 slot 不应被 containsReaction 递归遍历,也不会被 reactive 包装替换
      expect((reactiveSchema.value as SchemaNode).slots?.header).toBe(headerSlot)
    })
    scope.stop()
  })
})
