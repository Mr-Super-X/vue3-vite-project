<script setup lang="ts">
/**
 * v-copy 指令演示 —— 文本复制 + 兼容性降级
 *
 * 覆盖场景：
 *  - 静态字符串（字面量）
 *  - 响应式 ref（updated 时同步最新值）
 *  - 箭头函数（每次点击实时求值，避免闭包陈旧）
 *  - 空内容（warning 提示，底层 API 不调用）
 *
 * 路由：/demo/directive-copy
 */
import { ref } from 'vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-directive-copy')

/* ───── 演示数据 ───────────── */

// 静态字符串
const STATIC_TEXT = '客服电话：400-100-1001'

// 响应式 ref
const orderId = ref('ORD-2026-0911-001')
function regenerateOrderId(): void {
  orderId.value = `ORD-2026-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`
}

// 动态函数：每次点击实时求值
const lastTimestamp = ref('')
function copyTimestamp(): string {
  const now = new Date().toISOString()
  lastTimestamp.value = now
  return now
}

// 空内容
const EMPTY_TEXT = ''

const tocItems = [
  { id: 'demo-static', label: '静态字符串' },
  { id: 'demo-ref', label: '响应式 ref' },
  { id: 'demo-function', label: '动态函数' },
  { id: 'demo-empty', label: '空内容' },
  { id: 'demo-degrade', label: '降级原理' },
  { id: 'api-binding', label: 'Binding 类型' },
]

const bindingItems = [
  {
    name: 'value',
    type: 'string | () => string',
    required: true,
    description: '复制内容。字符串直传；函数每次点击实时执行，避免闭包陈旧',
  },
]

/* ───── code 字符串（避免 inline `<>` 触发 Vue 模板解析错误） ───────────── */

const staticCode = `<el-button v-copy="'客服电话：400-100-1001'">复制客服电话</el-button>`

const refCode = `<el-input v-model="orderId" />
<el-button v-copy="orderId">复制订单号</el-button>`

const functionCode = `<el-button v-copy="() => new Date().toISOString()">复制当前时间戳</el-button>`

const emptyCode = `<el-button v-copy="">复制空字符串</el-button>`

const degradeCode = `// 1. secure context + clipboard API 可用 → navigator.clipboard.writeText
// 2. 上述 API 抛错兜底 / 非 secure context → textarea + execCommand('copy')`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="v-copy 文本复制"
      source="src/directives/copy.ts"
      :introductions="[
        '全局指令：点击元素触发剪贴板复制，自动选择 navigator.clipboard.writeText 或降级到 execCommand。',
        '降级策略：HTTPS / localhost / file: 走现代 API；HTTP 环境或 API 失败时自动 fallback 到 textarea + execCommand。',
        '视觉反馈：通过 ElMessage 提示「复制成功」「复制失败」「内容为空」三种状态。',
        '点击按钮后到任意输入框 Ctrl+V 验证粘贴内容。',
      ]"
    >
      <!-- 静态字符串 -->
      <section id="demo-static">
        <DemoField label="静态字符串（字面量）" :code="staticCode">
          <el-button v-copy="STATIC_TEXT">复制客服电话</el-button>
          <p :class="bem.e('hint')">
            binding.value 是字符串字面量；指令在 updated 钩子中整体替换 ctx.binding
            引用以同步最新值。
          </p>
        </DemoField>
      </section>

      <!-- 响应式 ref -->
      <section id="demo-ref">
        <DemoField label="响应式 ref（点击复制最新值）" :code="refCode">
          <div :class="bem.e('row')">
            <el-input v-model="orderId" placeholder="订单号" style="width: 280px" />
            <el-button v-copy="orderId" type="primary">复制订单号</el-button>
            <el-button @click="regenerateOrderId">换一个</el-button>
          </div>
          <p :class="bem.e('hint')">
            修改输入框或点「换一个」会改变 orderId；点击「复制订单号」时拿到当前最新值。
          </p>
        </DemoField>
      </section>

      <!-- 动态函数 -->
      <section id="demo-function">
        <DemoField label="动态函数（每次点击实时求值）" :code="functionCode">
          <el-button v-copy="copyTimestamp" type="success">复制当前时间戳</el-button>
          <p :class="bem.e('hint')" v-if="lastTimestamp">
            最近一次复制的内容：
            <code>{{ lastTimestamp }}</code>
          </p>
          <p :class="bem.e('hint')">
            函数返回 ISO
            时间戳；连续点击若干次，到输入框粘贴能看到不同的时间——证明函数被实时调用，无闭包陈旧。
          </p>
        </DemoField>
      </section>

      <!-- 空内容 -->
      <section id="demo-empty">
        <DemoField label="空内容保护" :code="emptyCode">
          <el-button v-copy="EMPTY_TEXT" type="warning">复制空字符串</el-button>
          <p :class="bem.e('hint')">
            触发 ElMessage.warning("复制内容为空")，底层剪贴板 API
            不被调用，避免「点了没反应」的困惑。
          </p>
        </DemoField>
      </section>

      <!-- 降级原理 -->
      <section id="demo-degrade">
        <DemoField label="降级原理（决策矩阵）" :code="degradeCode">
          <p :class="bem.e('hint')">
            浏览器 Console 执行
            <code>window.isSecureContext</code>
            可查看当前是否为 HTTPS 环境。本地 dev（localhost）通常返回 true；部署到 HTTP 站点返回
            false。
          </p>
          <p :class="bem.e('hint')">
            非 secure context 下
            <code>navigator.clipboard === undefined</code>
            ，指令自动走 textarea 降级路径。
          </p>
        </DemoField>
      </section>

      <!-- API 文档 -->
      <ApiTable title="v-copy Binding" :items="bindingItems" anchor="api-binding" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-directive-copy {
  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  &__hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.6;

    code {
      padding: 1px 4px;
      background: var(--el-fill-color-light);
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
    }
  }
}
</style>
