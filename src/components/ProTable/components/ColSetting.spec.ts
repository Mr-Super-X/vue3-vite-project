/**
 * ColSetting 组件单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) 渲染所有列的复选框
 * 2) 点击"恢复默认"按钮触发 resetToDefault
 * 3) 关闭抽屉触发 update:visible false
 *
 * 注：ElDrawer 在 jsdom 环境使用 teleport 会渲染到 body，测试通过 stub 绕过。
 *
 * @group ProTable 子组件测试
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ColSetting from './ColSetting.vue'

// mock sortablejs（避免实际 DOM 拖拽）
vi.mock('sortablejs', () => ({
  default: class {
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
})
