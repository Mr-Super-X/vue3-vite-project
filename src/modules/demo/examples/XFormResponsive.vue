<script setup lang="ts">
/**
 * 演示响应式栅格
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
 * 联动需要 XForm 内部 useResizeObserver 触发 schema 重渲染。
 * 本次仅支持 schema 字段透传,字段值会传给 el-row / el-col props。
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
  // label-position 配置在 schema 顶层（自描述）
  // 'top' 让 label 在 input 上方,避免挤占 col 宽度（响应式布局推荐）
  labelPosition: 'top',
  // Row 响应式:不同断点不同 gutter（差距拉大便于观察）+ justify 居中变化
  // 注意：gutter 仅在"一行多列"时可见 —— xs 默认一行一列,sm+ 一行多列
  row: {
    gutter: 32,
    justify: 'start',
    responsive: {
      xs: { gutter: 0, justify: 'start' }, // 手机:无间距,一行一列
      sm: { gutter: 16, justify: 'start' }, // 平板:每行 4 字段
      md: { gutter: 40, justify: 'center' }, // 中屏:每行 4 字段,居中
      lg: { gutter: 60, justify: 'end' }, // 桌面:每行 4 字段,右对齐
      xl: { gutter: 80, justify: 'space-between' }, // 大屏:每行 4 字段,两端分散
    },
  },
  children: [
    // 4 个同行字段 —— xs 占满 24（一行一个）,sm+ 占 6（一行 4 个）使 gutter 可见
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '电话',
      name: 'phone',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '地址',
      name: 'address',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    // 第 2 行 4 字段
    {
      label: '公司',
      name: 'company',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '职位',
      name: 'title',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '部门',
      name: 'department',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
    {
      label: '入职日期',
      name: 'hireDate',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD' },
      col: { responsive: { xs: { span: 24 }, sm: { span: 6 } } },
    } as SchemaNode,
  ],
}

const model = reactive<Record<string, unknown>>({
  username: '',
  email: '',
  phone: '',
  address: '',
  company: '',
  title: '',
  department: '',
  hireDate: '',
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
      title="响应式栅格"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'RowConfig.responsive / ColConfig.responsive：不同断点下不同的 gutter / span / offset 等布局参数。',
        '断点（element-plus 标准 5 档）：xs < 768 / sm < 992 / md < 1200 / lg < 1920 / xl ≥ 1920',
        '注：el-row 不自动监听 viewport resize，运行时联动需 XForm 内部 useResizeObserver。',
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
              <el-tag size="large" type="primary">{{ currentBreakpoint }}</el-tag>
              <span style="margin-left: 12px">
                <strong>视口宽度:</strong>
                {{ width }}px
              </span>
            </div>
            <div>
              <strong>说明:</strong>
              请
              <strong>调整浏览器窗口宽度</strong>
              ,观察:
              <ul>
                <li>
                  <strong>字段间距</strong>
                  :xs=0 → sm=16 → md=40 → lg=60 → xl=80 (px)
                </li>
                <li>
                  <strong>水平对齐</strong>
                  :xs=左对齐 → md=居中 → lg=右对齐 → xl=两端分散
                </li>
                <li>
                  <strong>字段宽度</strong>
                  :col.responsive 控制 span(xs=24 占满 / md=6 占 1/4)
                </li>
              </ul>
              resize 后立即可见字段间距和对齐方式变化。
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
