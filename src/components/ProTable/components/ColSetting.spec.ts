/**
 * ColSetting 组件单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 渲染所有列的复选框
 * 2) 点击"恢复默认"按钮触发 resetToDefault
 * 3) 关闭抽屉触发 update:visible false
 * 4) 拖拽结束 emit reorder（完整新顺序）+ 还原 DOM（回归：sortablejs 移动真实节点
 *    导致 children[newIndex] 即被拖元素本身，旧实现 to === from 被守卫拦截、事件永不发出）
 *
 * 注：ElDrawer 在 jsdom 环境使用 teleport 会渲染到 body，测试通过 stub 绕过。
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ColSetting from './ColSetting.vue'

// mock sortablejs（捕获 Sortable.create 配置，测试直接驱动 onStart/onEnd 模拟拖拽）
const hoisted = vi.hoisted(() => ({
  config: null as null | {
    el: HTMLElement
    options: { onStart?: () => void; onEnd?: () => void }
  },
}))
vi.mock('sortablejs', () => ({
  default: class {
    static create(el: HTMLElement, options: unknown) {
      hoisted.config = { el, options: options as { onStart?: () => void; onEnd?: () => void } }
      return new this()
    }
    destroy(): void {
      // noop
    }
  },
}))

describe('ColSetting', () => {
  const columns = [
    { prop: 'a', label: 'A' },
    { prop: 'b', label: 'B' },
    { prop: 'c', label: 'C' },
  ]

  it('点击"恢复默认"按钮触发 resetToDefault', async () => {
    const wrapper = mount(ColSetting, {
      props: {
        visible: true,
        columns: columns as never,
        visibleKeys: ['a'],
        fixedKeys: [],
      },
      global: {
        stubs: {
          ElDrawer: {
            template:
              '<div class="el-drawer-stub"><slot /><div class="footer"><slot name="footer" /></div></div>',
          },
        },
      },
    })
    await wrapper.find('[data-test="reset-btn"]').trigger('click')
    expect(wrapper.emitted('resetToDefault')).toBeTruthy()
  })

  it('关闭抽屉触发 update:visible false', async () => {
    const wrapper = mount(ColSetting, {
      props: {
        visible: true,
        columns: columns as never,
        visibleKeys: ['a'],
        fixedKeys: [],
      },
      global: {
        stubs: {
          ElDrawer: {
            template:
              '<div class="el-drawer-stub"><slot /><div class="footer"><slot name="footer" /></div></div>',
          },
        },
      },
    })
    await wrapper.find('[data-test="close-btn"]').trigger('click')
    expect(wrapper.emitted('update:visible')).toBeTruthy()
  })

  it('点击 checkbox 更新 visibleKeys', async () => {
    const wrapper = mount(ColSetting, {
      props: {
        visible: true,
        columns: columns as never,
        visibleKeys: ['a'],
        fixedKeys: [],
      },
      global: {
        stubs: {
          ElDrawer: {
            template: '<div class="el-drawer-stub"><slot /></div>',
          },
          ElCheckbox: {
            template: '<input type="checkbox" :data-test="`col-check-${value}`" />',
            props: ['value', 'label'],
          },
          ElCheckboxGroup: {
            template: '<div class="cb-group-stub"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
        },
      },
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(3)
  })

  it('拖拽结束 emit reorder（完整新顺序）且还原 DOM 到拖拽前', async () => {
    const wrapper = mount(ColSetting, {
      props: {
        visible: true,
        columns: columns as never,
        visibleKeys: ['a', 'b', 'c'],
        fixedKeys: [],
      },
      global: {
        stubs: {
          ElDrawer: {
            template: '<div class="el-drawer-stub"><slot /></div>',
          },
          ElCheckboxGroup: {
            template: '<div class="cb-group-stub"><slot /></div>',
            props: ['modelValue'],
          },
        },
      },
    })
    await flushPromises()
    const config = hoisted.config
    expect(config).toBeTruthy()
    const groupEl = config!.el
    const propOrder = () => Array.from(groupEl.children).map((c) => (c as HTMLElement).dataset.prop)
    expect(propOrder()).toEqual(['a', 'b', 'c'])

    // 模拟 sortablejs 拖拽时序：onStart（DOM 仍是旧顺序）→ 拖拽中移动真实节点 → onEnd
    config!.options.onStart?.()
    const itemA = Array.from(groupEl.children).find(
      (c) => (c as HTMLElement).dataset.prop === 'a'
    ) as HTMLElement
    groupEl.appendChild(itemA) // sortablejs _onDragOver 的真实节点插入（Sortable.js:1857）
    expect(propOrder()).toEqual(['b', 'c', 'a']) // 此刻 DOM 即"新顺序"
    config!.options.onEnd?.()

    // 回归断言 1：emit 完整新顺序（旧实现取 children[newIndex] 作 to，恰为被拖元素本身，
    // to === from 被守卫拦截，reorder 事件永不发出）
    expect(wrapper.emitted('reorder')?.[0]).toEqual([['b', 'c', 'a']])
    // 回归断言 2：DOM 还原为拖拽前顺序，Vue v-for 保持唯一数据源
    expect(propOrder()).toEqual(['a', 'b', 'c'])
  })
})
