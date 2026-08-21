<script setup lang="ts">
/**
 * 演示 P1-3 响应式栅格
 *
 * 场景：
 * 1. RowConfig.responsive:不同断点下 gutter / type / align / justify 不同
 * 2. ColConfig.responsive:不同断点下 span / offset / push / pull 不同
 * 3. 数组节点 col.responsive 透传
 *
 * 断点(element-plus 标准 5 档):
 * - xs: < 768px(手机)
 * - sm: ≥ 768px(平板)
 * - md: ≥ 992px(小屏)
 * - lg: ≥ 1200px(桌面)
 * - xl: ≥ 1920px(大屏)
 *
 * 注:element-plus el-row 不自动监听 viewport resize 切换断点 —— 运行时响应式
 * 联动需要 XForm 内部 useResizeObserver 触发 schema 重渲染(P2 阶段)。
 * 本次 P1-3 仅支持 schema 字段透传,字段值会传给 el-row / el-col props。
 */
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormResponsive.vue?raw'

const bem = createNamespace('demo-x-form-responsive')

// ============== 响应式断点(仅 demo 显示用) ==============
const currentBreakpoint = ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')
const width = ref(0)
const updateBreakpoint = () => {
  if (typeof window === 'undefined') return
  width.value = window.innerWidth
  if (width.value < 768) currentBreakpoint.value = 'xs'
  else if (width.value < 992) currentBreakpoint.value = 'sm'
  else if (width.value < 1200) currentBreakpoint.value = 'md'
  else if (width.value < 1920) currentBreakpoint.value = 'lg'
  else currentBreakpoint.value = 'xl'
}
onMounted(() => {
  updateBreakpoint()
  window.addEventListener('resize', updateBreakpoint)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateBreakpoint)
})

const schema: SchemaNode = {
  // Row 响应式:不同断点不同 gutter
  row: {
    gutter: 16,
    responsive: {
      xs: { gutter: 0 },
      sm: { gutter: 8 },
      md: { gutter: 16 },
      lg: { gutter: 24 },
      xl: { gutter: 32 },
    },
  },
  children: [
    // 1. 用户名 —— 手机 xs 占满,平板 12,桌面 6
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      col: {
        responsive: {
          xs: { span: 24 },
          sm: { span: 12 },
          md: { span: 6 },
        },
      },
    } as SchemaNode,

    // 2. 邮箱 —— 桌面 12(右半边),手机占满
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      col: {
        responsive: {
          xs: { span: 24 },
          sm: { span: 12 },
          md: { span: 6 },
        },
      },
    } as SchemaNode,

    // 3. 密码 —— 桌面居中(8/24 偏移)
    {
      label: '密码',
      name: 'password',
      component: 'Input',
      props: { type: 'password' },
      col: {
        responsive: {
          xs: { span: 24 },
          sm: { span: 24 },
          md: { span: 12, offset: 6 },
        },
      },
    } as SchemaNode,

    // 4. 备注 —— 全宽(响应式始终 span=24)
    {
      label: '备注(全宽)',
      name: 'note',
      component: 'Input',
      props: { type: 'textarea', rows: 3 },
      col: {
        responsive: {
          xs: { span: 24 },
          sm: { span: 24 },
          md: { span: 24 },
        },
      },
    } as SchemaNode,

    // 5. 数组节点 —— 透传 col.responsive 到每行
    {
      kind: 'array',
      name: 'contacts',
      label: '联系人(响应式 col)',
      array: {
        itemSchema: {
          component: 'Input',
          col: {
            responsive: {
              xs: { span: 24 },
              sm: { span: 12 },
              md: { span: 8 },
            },
          },
        } as SchemaNode,
      },
    } as SchemaNode,
  ],
}

const model = reactive<Record<string, unknown>>({
  username: '',
  email: '',
  password: '',
  note: '',
  contacts: [{ name: '' }],
})

const formRef = ref<XFormExpose | null>(null)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage({
    message: '保存成功:\n' + JSON.stringify(model, null, 2),
    type: 'success',
    duration: 0,
    showClose: true,
  })
}

function onReset() {
  formRef.value?.resetFields()
}

async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="响应式栅格（P1-3）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'P1-3 新增 RowConfig.responsive + ColConfig.responsive 字段:',
        '1. RowConfig.responsive:不同断点下不同的 gutter / type / align / justify',
        '2. ColConfig.responsive:不同断点下不同的 span / offset / push / pull',
        '3. 数组节点 col.responsive 透传:每行 col 也支持响应式',
        '断点(element-plus 标准 5 档):xs < 768 / sm < 992 / md < 1200 / lg < 1920 / xl ≥ 1920',
        '注:el-row 不自动监听 viewport resize —— 运行时响应式联动需 P2 阶段 useResizeObserver',
      ]"
    >
      <section id="demo-responsive">
        <DemoField label="响应式" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('state')">
            <div>
              <strong>当前断点:</strong>
              <el-tag>{{ currentBreakpoint }}</el-tag>
              <span style="margin-left: 12px">
                <strong>视口宽度:</strong>
                {{ width }}px
              </span>
            </div>
            <div>
              <strong>说明:</strong>
              请调整浏览器窗口大小,观察表单字段在桌面 / 平板 / 手机 下的布局变化(schema
              配置的响应式断点会传给 el-row / el-col)。
            </div>
            <div>当前 model：</div>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-responsive {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }

  &__state {
    margin-top: 16px;
    font-size: 12px;
    color: #909399;

    pre {
      background: #f5f7fa;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Menlo', 'Consolas', monospace;
      overflow-x: auto;
      margin: 4px 0;
    }
  }
}
</style>
