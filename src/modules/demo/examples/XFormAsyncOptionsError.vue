<script setup lang="ts">
/**
 * 演示 asyncOptions.onError + immediate: false
 *
 * 场景：城市选择器（含网络异常处理 + 延迟加载）
 *   1. onError 回调：请求失败 → toast 提示 + 不阻塞 UI（默认行为）
 *   2. immediate: false —— 节点创建时不请求，由外部 trigger 触发
 *   3. 手动重试：trigger() / refreshOptions() 实例方法
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { asyncOptionsItems } from './xform-demos-api'
import xFormSource from './XFormAsyncOptionsError.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'async-options-error',
  schema: () => schema,
  model: () => model,
})

const CITIES = [
  { id: 1, name: '北京' },
  { id: 2, name: '上海' },
  { id: 3, name: '广州' },
]

// 模拟接口：根据参数决定成败
async function mockFetchCities(_keyword?: string): Promise<typeof CITIES> {
  await new Promise<void>((r) => setTimeout(r, 400))
  // 测试 1: 让 source 故意抛错 → onError 接管
  if (model.forceFail) {
    throw new Error('模拟网络错误（mockFetchCities 抛错）')
  }
  return CITIES
}

const model = reactive<Record<string, unknown>>({
  forceFail: false,
  city: undefined,
})

const schema: SchemaNode = {
  column: 1,
  children: [
    // 测试开关：开启后 source 抛错
    {
      label: '强制失败（模拟接口报错）',
      name: 'forceFail',
      component: 'Switch',
      // 说明移至 template 顶部的 <p> 段落，Switch 无 description prop
    },
    {
      label: '城市（含 onError 错误处理）',
      name: 'city',
      component: 'Select',
      props: { placeholder: '点击下拉加载', clearable: true },
      asyncOptions: {
        source: mockFetchCities,
        // 监听 forceFail 变化：开/关切换触发 source 重跑，演示 onError 回调
        deps: 'forceFail',
        transform: (raw: unknown[]) =>
          (raw as Array<{ id: number; name: string }>).map((it) => ({
            label: it.name,
            value: it.id,
          })),
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          ElMessage({
            message: '加载失败：' + message,
            type: 'error',
            duration: 0,
            showClose: true,
          })
        },
      },
    },
    {
      // ⚠️ 已知限制：immediate: false 字段在 XForm 引擎当前不实现 visibleChange 触发 source
      // 实际行为：source 永远不调用，下拉列表始终为空
      // 设计意图：immediate:false 用于大表单按需加载（节省初次 N 个并发请求）
      // 当前演示：仅展示 schema 字段语法，不演示实际加载行为
      // 修复方案：XForm 引擎需在 use-async-options.ts 增加 visible 状态监听 + 路由 visible-change 事件
      label: '按需加载城市（immediate: false — 引擎限制）',
      name: 'cityLazy',
      component: 'Select',
      props: { placeholder: '⚠️ XForm 引擎未实现 visibleChange 触发 source', clearable: true },
      asyncOptions: {
        source: mockFetchCities,
        immediate: false, // 当前不触发
        transform: (raw: unknown[]) =>
          (raw as Array<{ id: number; name: string }>).map((it) => ({
            label: it.name,
            value: it.id,
          })),
      },
    },
  ],
}

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
  { id: 'demo-async-options-error', label: 'asyncOptions 错误处理演示' },
  { id: 'api-async-options', label: 'AsyncOptionsConfig 速查' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="asyncOptions.onError + immediate: false"
      source="src/components/form-schema/composables/use-async-options.ts"
      :introductions="[
        'onError 回调：source 抛错时触发——业务侧 toast / 上报 / fallback 均可',
        '默认行为：error 写入节点内部 state，AsyncOptions UI 显示「加载失败」提示',
        'immediate: false：节点创建时不请求——按需触发（性能优化、大表单避免一次性发 N 个接口）',
        '⚠️ XForm 引擎限制：immediate: false 字段的「按需触发」目前未实现 visibleChange 监听，source 永远不调用',
        '测试 1: 开启「强制失败」开关 → onError toast 立即弹出（deps 触发「城市」字段 source 重跑）',
        '测试 2: 关闭「强制失败」→ 「城市」下拉显示 3 个城市（deps 触发 source 重跑成功）',
        '测试 3: 点击「按需加载城市」下拉 — 当前不工作（XForm 引擎 limitation 演示）',
      ]"
    >
      <section id="demo-async-options-error">
        <DemoField label="asyncOptions 错误处理" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="AsyncOptionsConfig 速查"
        :items="asyncOptionsItems"
        anchor="api-async-options"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-async-options-error {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
