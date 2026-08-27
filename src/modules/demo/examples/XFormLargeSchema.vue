<script setup lang="ts">
/**
 * 大 schema 性能演示
 * - 100+ 字段(模拟生产中后台)
 * - 控制台输出 mount / 输入响应 / reaction 耗时
 * - 浏览器 DevTools 可观察 100+ 输入框渲染 + 输入流畅度
 */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { largeSchemaItems } from './xform-demos-api'
import xFormSource from './XFormLargeSchema.vue?raw'

const bem = createNamespace('demo-x-form-large-schema')

const FIELD_COUNT = 120
const formRef = ref<XFormExpose | null>(null)

function buildSchema(count: number): SchemaNode {
  const children: SchemaNode[] = []
  for (let i = 0; i < count; i++) {
    children.push({
      label: `字段 ${i + 1}`,
      name: `f${i}`,
      component: 'Input',
      props: { placeholder: `请输入字段 ${i + 1}` },
      rules: [{ required: true, message: `字段 ${i + 1} 必填`, trigger: 'blur' }],
    } as SchemaNode)
  }
  return { column: 3, children }
}

const schema = buildSchema(FIELD_COUNT)
const model = reactive<Record<string, unknown>>({})

// 性能监控
const perfInfo = ref({
  mountTime: 0,
  fieldCount: FIELD_COUNT,
})

onMounted(() => {
  const start = performance.now()
  // 触发一次重渲染
  setTimeout(() => {
    perfInfo.value.mountTime = Math.round(performance.now() - start)
  }, 0)
})

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage.success('保存成功')
}

const tocItems = [
  { id: 'demo-large-schema', label: '性能演示' },
  { id: 'api-large-schema', label: '性能观察要点' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      :title="`大 schema 性能测试（${FIELD_COUNT} 字段）`"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        `大 schema 性能测试:本 Demo 自动生成 ${FIELD_COUNT} 个 Input 字段 + 校验规则`,
        '观察项:',
        '  - 首次 mount 速度(控制台 perfInfo.mountTime)',
        '  - 输入任意字段的响应速度(无明显卡顿)',
        '  - 滚动 / 校验 / 重置等操作流畅度',
        '控制台输出 mount 耗时(单位 ms)',
        '性能基准对照:mount < 200ms 流畅,200-500ms 可接受,> 500ms 需优化',
      ]"
    >
      <section id="demo-large-schema">
        <DemoField label="大 schema" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div style="margin-top: 12px">
            <el-button type="primary" @click="onSave">保存(测试 100 字段全量校验)</el-button>
            <span style="margin-left: 16px; font-size: 12px; color: #909399">
              字段数:
              <strong>{{ perfInfo.fieldCount }}</strong>
              Mount 耗时(初始):
              <strong>{{ perfInfo.mountTime }}ms</strong>
            </span>
          </div>
          <details :class="bem.e('model')">
            <summary>查看完整 model（JSON，{{ perfInfo.fieldCount }} 字段）</summary>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </details>
        </DemoField>
      </section>

      <ApiTable title="性能观察要点" :items="largeSchemaItems" anchor="api-large-schema" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-large-schema {
  &__model {
    margin-top: 12px;
    font-size: 12px;
    summary {
      cursor: pointer;
      color: #6b7280;
    }
    pre {
      background: #f5f7fa;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Menlo', 'Consolas', monospace;
      overflow-x: auto;
      margin: 4px 0;
      max-height: 320px;
    }
  }
}
</style>
