/**
 * layouts/big 布局壳测试（T12 组件冒烟）。
 *
 * 覆盖渲染层三条关键路径（纯函数层已由 scale.spec.ts 18 用例覆盖）：
 *   1. setup 顶层初始化 → stage 内联样式按默认设计稿 1920×1080 生效
 *   2. provide(BIG_SCALE_STATE_KEY) 注入链路 → 子组件（BigChart）可消费
 *   3. 同 layout 内路由 meta.bigScreen 切换 → watch 立即重算（不防抖，无中间态闪烁）
 *
 * 路由用 createMemoryHistory 真实实例（menu.spec.ts 范式）：
 * useRoute() 的响应式 meta 依赖真实路由跳转，mock 记录无法复现。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, inject, nextTick, ref, type Ref } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import BigLayout from './index.vue'
import { BIG_SCALE_STATE_KEY, computeBigScale, type BigScaleState } from './config/scale'

/** 探针：读取 layout provide 的 scale 状态（BigChart 消费链路的冒烟替身） */
const injectedScale = ref<number | null>(null)
const InjectProbe = defineComponent({
  name: 'InjectProbe',
  setup() {
    // 注意：provide 的值是 readonly Ref<BigScaleState>（见 big/index.vue provide 处），须先 .value
    const state = inject<Readonly<Ref<BigScaleState>>>(BIG_SCALE_STATE_KEY)
    injectedScale.value = state?.value.scale ?? null
    return () => null
  },
})

function makeRouter(): ReturnType<typeof createRouter> {
  const routes: RouteRecordRaw[] = [
    // 根路由渲染 inject 探针：验证 provide(BIG_SCALE_STATE_KEY) 的消费链路
    { path: '/', component: InjectProbe },
    {
      path: '/wide',
      component: InjectProbe,
      meta: { bigScreen: { width: 9000, height: 1080 } },
    },
  ]
  return createRouter({ history: createMemoryHistory(), routes })
}

async function mountAt(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  return mount(BigLayout, { global: { plugins: [router] } })
}

describe('layouts/big — 布局壳渲染路径', () => {
  beforeEach(() => {
    injectedScale.value = null
  })

  it('setup 顶层初始化：stage 按默认设计稿 1920×1080 应用内联样式', async () => {
    const wrapper = await mountAt('/')
    const stage = wrapper.find('.vv-big-layout__stage')

    expect(stage.exists()).toBe(true)
    expect(stage.attributes('style')).toContain('width: 1920px')
    expect(stage.attributes('style')).toContain('height: 1080px')
    expect(stage.attributes('style')).toContain('translate(')
    expect(stage.attributes('style')).toContain('scale(')
  })

  it('provide 注入链路：子组件经 BIG_SCALE_STATE_KEY 读到与 computeBigScale 一致的 scale', async () => {
    const expected = computeBigScale(
      { width: 1920, height: 1080 },
      window.innerWidth,
      window.innerHeight
    ).scale
    await mountAt('/')
    expect(injectedScale.value).toBe(expected)
  })

  it('meta.bigScreen 路由切换 → stage 立即重算（9000×1080，无防抖中间态）', async () => {
    const wrapper = await mountAt('/')
    const router = wrapper.vm.$router

    await router.push('/wide')
    await nextTick()

    const stage = wrapper.find('.vv-big-layout__stage')
    expect(stage.attributes('style')).toContain('width: 9000px')
    expect(stage.attributes('style')).toContain('height: 1080px')
  })
})
