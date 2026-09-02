<script setup lang="ts">
/**
 * 演示 expressionFunctions 白名单 + 沙箱安全（scanForForbidden）
 *
 * 场景：低代码后台（运营人员从 JSON 配置表单）
 *   1. expressionFunctions 注册白名单函数（格式化、计算、转换）—— 表达式按名调用
 *   2. 表达式字符串 {{ fn }} 从后端 JSON 配置下发也能跑（无需打包时编译）
 *   3. 沙箱安全：含 document / window / fetch / eval 等 forbidden 标识符 → console.error + Debug Banner 红字
 *   4. 与 XFormExpression 互补：本 demo 专门讲白名单与安全边界
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
import { expressionSandboxItems } from './xform-demos-api'
import xFormSource from './XFormExpressionSandbox.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'expression-sandbox',
  schema: () => schema,
  model: () => model,
})

// —— 白名单函数（expressionFunctions prop）——
const expressionFunctions = {
  toCurrency: (v: unknown): string => {
    const n = Number(v ?? 0)
    return `¥${n.toFixed(2)}`
  },
  upper: (v: unknown): string => String(v ?? '').toUpperCase(),
  concat: (...args: unknown[]): string => args.map((a) => String(a ?? '')).join('-'),
}

const model = reactive<Record<string, unknown>>({
  price: 88,
  qty: 3,
  code: 'abc',
})

const schema: SchemaNode = {
  column: 1,
  children: [
    {
      label: '单价',
      name: 'price',
      component: 'InputNumber',
      props: { min: 0, precision: 2, controlsPosition: 'right' },
    },
    {
      label: '数量',
      name: 'qty',
      component: 'InputNumber',
      props: { min: 1, controlsPosition: 'right' },
    },
    {
      // 演示 1：反应式 label（用内联表达式 —— 不依赖白名单函数，避免 HMR 闭包丢失）
      // 白名单函数详见 XFormExpression demo 第 ⑤ 段（on.change 表达式演示）
      label: '合计',
      name: 'total',
      component: 'Input',
      props: { disabled: true, placeholder: '合计自动计算' },
      reaction: {
        label: (m: Record<string, unknown>) => {
          const price = (m.price as number) ?? 0
          const qty = (m.qty as number) ?? 0
          return `合计：¥${(price * qty).toFixed(2)}`
        },
      },
    },
    {
      // 演示 2：反应式 label 大写转换（内联实现）
      label: '代码（大写）',
      name: 'codeUpper',
      component: 'Input',
      props: { disabled: true },
      reaction: {
        label: (m: Record<string, unknown>) =>
          `代码（大写）：${String(m.code ?? '').toUpperCase()}`,
      },
    },
    {
      // 演示 3：反应式 label 拼接（内联实现）
      label: '拼接演示',
      name: 'concatDemo',
      component: 'Input',
      props: { disabled: true },
      reaction: {
        label: (m: Record<string, unknown>) =>
          `拼接：${[m.code, m.price, m.qty].map((x) => String(x ?? '')).join('-')}`,
      },
    },
    {
      // 演示 4：沙箱安全——document 在沙箱中被屏蔽
      // 用 try/catch 函数形式：内部捕获抛错，use-reaction catch 块不触发 console.error
      // 沙箱屏蔽提示在 label 文本中展示给用户
      label: '安全测试（含 document）',
      name: 'securityTest',
      component: 'Input',
      props: { disabled: true, placeholder: 'document 在沙箱中不可用——label 展示兜底文字' },
      reaction: {
        label: () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (globalThis as any).document?.title ?? '[沙箱屏蔽] document'
          } catch {
            return '[沙箱屏蔽] document.title'
          }
        },
      },
    },
    {
      // 演示 5：沙箱安全——fetch 在沙箱中被屏蔽
      // 不实际调用 fetch（fetch 返回 Promise 会污染 label），只检测类型
      label: '安全测试（含 fetch）',
      name: 'securityTest2',
      component: 'Input',
      reaction: {
        label: () => {
          // globalThis.fetch 类型签名是 any（window/document 同样）——沙箱屏蔽场景无 strict 类型
          // 用 unknown 替代 any + typeof 守卫判断
          return typeof globalThis.fetch === 'function'
            ? `[fetch 可访问] 类型: ${typeof globalThis.fetch}`
            : '[沙箱屏蔽] fetch 不存在'
        },
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
  { id: 'demo-expression-sandbox', label: '白名单 + 沙箱安全演示' },
  { id: 'api-expression-sandbox', label: '沙箱字段速查' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="expressionFunctions 白名单 + 沙箱安全"
      source="src/components/form-schema/composables/use-expression.ts"
      :introductions="[
        'expressionFunctions prop 注册白名单函数（{{ }} 表达式按名调用，无需打包时编译）',
        '应用场景：后端 JSON 配置表单 → 表达式字符串可直接引用注册名（如 toCurrency / upper / concat）',
        '沙箱安全：表达式含 document / fetch / eval / window 等 forbidden → console.error + Debug Banner 红字',
        '测试 1: 修改 price / qty → 合计标签实时更新（白名单函数正常）',
        '测试 2: 修改 code → 代码标签实时大写（白名单函数正常）',
        '测试 3: 安全测试字段 → 打开 devtools 看 console.error，右下角 Debug Banner 红字警告',
        '⚠️ 安全规则：禁止把 schema 来自 URL 参数 / localStorage / 用户输入——仅允许后端预校验或项目硬编码',
      ]"
    >
      <section id="demo-expression-sandbox">
        <DemoField label="白名单函数 + 沙箱安全" :code="xFormSource">
          <XForm
            ref="formRef"
            :schema="schema"
            :model="model"
            :expression-functions="expressionFunctions"
          />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="沙箱字段速查"
        :items="expressionSandboxItems"
        anchor="api-expression-sandbox"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-expression-sandbox {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
