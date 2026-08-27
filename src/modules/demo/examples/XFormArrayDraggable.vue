<script setup lang="ts">
/**
 * 演示 ArrayNode 行拖拽排序（draggable）
 *
 * 场景：迭代任务队列 — 团队按优先级排期任务，支持：
 * 1. .draggable() 开启 HTML5 行拖拽（drop 后走 moveItem 更新 model）
 * 2. 「数据换位」验证：先编辑某行内容再拖动，值跟着行走（行身份保持）
 * 3. 上下移按钮与拖拽共存，同一条 moveItem 数据通路
 * 4. minItems / maxItems 边界约束照常生效
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import { xArray } from '@/components/form-schema/builders'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { arrayItems } from './xform-demos-api'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import xFormSource from './XFormArrayDraggable.vue?raw'

const bem = createNamespace('demo-x-form-array-draggable')

/** 单行 schema：任务名 + 负责人 + 预估工时并排 */
const taskItemSchema: SchemaNode = {
  column: 3,
  row: { gutter: 12 },
  children: [
    {
      label: '任务名称',
      name: 'title',
      rules: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
      component: 'Input',
      props: { placeholder: '如：梳理 PRD 评审意见' },
    },
    {
      label: '负责人',
      name: 'owner',
      rules: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
      component: 'Input',
      props: { placeholder: '角色或姓名' },
    },
    {
      label: '预估工时(h)',
      name: 'hours',
      component: 'InputNumber',
      props: { min: 0, max: 40, placeholder: '0-40', controlsPosition: 'right' },
    },
  ],
}

/** 顶层 schema：单个 ArrayNode，链式末尾 .draggable() 开启拖拽 */
const schema: SchemaNode = {
  children: [
    xArray('tasks')
      .label('任务队列')
      .title('任务队列（可拖拽行调整顺序）')
      .item(taskItemSchema)
      .initialLength(3)
      .minItems(1)
      .maxItems(6)
      .labels({ add: '新增任务', remove: '删除', moveUp: '上移', moveDown: '下移' })
      .draggable()
      .build(),
  ],
}

const model = reactive<Record<string, unknown>>({
  tasks: [
    { title: '梳理 PRD 评审意见', owner: '产品', hours: 4 },
    { title: '联调登录接口', owner: '前端', hours: 8 },
    { title: '补充回归测试用例', owner: '测试', hours: 6 },
  ],
})

const formRef = ref<XFormExpose | null>(null)

/** 当前任务顺序的只读文本（拖拽后随 model 实时刷新） */
const taskOrderText = computed(() =>
  ((model.tasks as Array<{ title?: string }> | undefined) ?? [])
    .map((t, i) => `${i + 1}. ${t.title}`)
    .join('\n')
)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败，请检查必填项')
    return
  }
  ElMessage({
    message: '保存成功，当前顺序：\n' + taskOrderText.value,
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
    ElMessage.error('复制失败，请手动选择')
  }
}

const tocItems = [
  { id: 'demo-array-draggable', label: '拖拽排序演示' },
  { id: 'api-array-draggable', label: 'ArrayNodeConfig' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="数组行拖拽排序（ArrayNode draggable）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '1. 链式调用末尾 .draggable() 开启行拖拽，等价于 schema 上 array.draggable: true',
        '2. 按住任意一行的空白区域拖到目标行松开即换位 —— HTML5 Drag & Drop，drop 后调 moveItem 更新 model',
        '3. 「数据换位」而非仅视图换位：先在某一行的输入框里改内容，再拖动该行 —— 已编辑的值会跟着行走',
        '4. 与上移/下移按钮共存，两条交互路径共用同一个 moveItem，model 只有一份真相',
        '5. 未配置 draggable 时行不可拖，其余行为完全一致',
      ]"
    >
      <section id="demo-array-draggable">
        <DemoField label="任务队列（按住行拖拽排序）" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('summary')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('state')">
            <div>model.tasks 当前顺序（拖拽后实时刷新）：</div>
            <pre>{{ taskOrderText }}</pre>
          </div>
        </DemoField>
      </section>

      <ApiTable title="ArrayNodeConfig" :items="arrayItems" anchor="api-array-draggable" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-array-draggable {
  &__summary {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    align-items: center;
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
      white-space: pre-wrap;
      margin: 4px 0;
    }
  }

  /* 可拖拽行的视觉提示（ArrayNode 渲染的行容器类） */
  .array-node__row {
    cursor: grab;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &:active {
      cursor: grabbing;
    }
  }
}
</style>
