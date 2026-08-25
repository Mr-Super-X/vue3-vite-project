<script setup lang="ts">
/**
 * XForm asyncOptions 异步数据源演示
 *
 * 场景：
 * 1. 城市选择：组件创建时自动远程加载 options
 * 2. 区域选择：依赖 city 字段，city 变化时自动重新加载
 * 3. 错误处理：演示 source 抛错时的 onError 回调
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { asyncOptionsItems } from './xform-demos-api'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormAsyncOptions.vue?raw'

const bem = createNamespace('demo-x-form-async-options')

// 模拟远程 API 延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchCities(): Promise<Array<{ id: number; name: string }>> {
  await delay(600)
  return [
    { id: 1, name: '北京' },
    { id: 2, name: '上海' },
    { id: 3, name: '广州' },
  ]
}

async function fetchDistricts(cityId?: number): Promise<Array<{ id: number; name: string }>> {
  await delay(400)
  const data: Record<number, Array<{ id: number; name: string }>> = {
    1: [
      { id: 11, name: '朝阳区' },
      { id: 12, name: '海淀区' },
    ],
    2: [
      { id: 21, name: '浦东新区' },
      { id: 22, name: '徐汇区' },
    ],
    3: [
      { id: 31, name: '天河区' },
      { id: 32, name: '越秀区' },
    ],
  }
  return cityId ? (data[cityId] ?? []) : []
}

const schema: SchemaNode = {
  column: 1,
  children: [
    {
      label: '城市',
      name: 'city',
      component: 'Select',
      props: { placeholder: '请选择城市', clearable: true },
      asyncOptions: {
        source: fetchCities,
        transform: (raw) =>
          (raw as Array<{ id: number; name: string }>).map((item) => ({
            label: item.name,
            value: item.id,
          })),
      },
    },
    {
      label: '区域',
      name: 'district',
      component: 'Select',
      props: { placeholder: '请先选择城市', clearable: true },
      asyncOptions: {
        source: () => fetchDistricts(model.city as number | undefined),
        deps: 'city',
        transform: (raw) =>
          (raw as Array<{ id: number; name: string }>).map((item) => ({
            label: item.name,
            value: item.id,
          })),
      },
    },
    {
      label: '模拟错误',
      name: 'errorDemo',
      component: 'Select',
      props: { placeholder: '该选项会加载失败' },
      asyncOptions: {
        source: async () => {
          await delay(300)
          throw new Error('模拟网络错误')
        },
        onError: (err) => {
          ElMessage.error(`区域加载失败：${err instanceof Error ? err.message : String(err)}`)
        },
      },
    },
  ],
}

const model = reactive<Record<string, unknown>>({})
const formRef = ref<{
  validate: (cb?: (valid: boolean) => void) => Promise<boolean>
  resetFields: () => void
} | null>(null)

function onSave() {
  formRef.value?.validate((valid) => {
    if (valid) {
      ElMessage({
        message: '保存成功：\n' + JSON.stringify(model, null, 2),
        type: 'success',
        duration: 0,
        showClose: true,
      })
    } else {
      ElMessage.error('校验失败，请检查字段')
    }
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
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="异步选项（asyncOptions）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '城市选择：组件创建时自动调用 source 加载 options。',
        '区域选择：通过 deps: \'city\' 实现依赖联动，city 变化时自动重新加载。',
        '错误处理：source 抛错时触发 onError，并通过 ElMessage 提示。',
      ]"
    >
      <section id="demo-async-options">
        <DemoField label="异步数据源表单" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
        </DemoField>
      </section>

      <ApiTable title="AsyncOptionsConfig" :items="asyncOptionsItems" anchor="api-async-options" />
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-async-options {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
