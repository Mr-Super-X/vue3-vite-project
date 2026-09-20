<script setup lang="ts">
/**
 * v-buttonDebounce 指令演示 —— 按钮点击节流防重
 *
 * 覆盖场景：
 *  - 默认 500ms 防抖（trailing edge）
 *  - 自定义延迟（arg 语法：v-buttonDebounce:1000）
 *  - 快速连点验证（保护 submit / 支付按钮）
 *  - 与 v-inputDebounce 对比：click 事件无中文输入法问题
 *
 * 路由：/demo/directive-button-debounce
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-directive-button-debounce')

/* ───── 演示数据 ───────────── */

// 默认 500ms 防抖
const defaultClickCount = ref(0)
const defaultLog = ref<string[]>([])
function onDefaultClick(): void {
  defaultClickCount.value++
  defaultLog.value = [
    ...defaultLog.value,
    `第 ${defaultClickCount.value} 次触发（${new Date().toLocaleTimeString()}）`,
  ].slice(-8)
  ElMessage.success(`默认防抖触发（累计 ${defaultClickCount.value} 次）`)
}

// 自定义 1000ms 防抖
const customClickCount = ref(0)
function onCustomClick(): void {
  customClickCount.value++
  ElMessage.success(`1000ms 防抖触发（累计 ${customClickCount.value} 次）`)
}

// 无防抖对比
const rawClickCount = ref(0)
function onRawClick(): void {
  rawClickCount.value++
}

// 实战 submit：独立回调 + 独立计数，避免与「默认 500ms 防抖」按钮的
// onDefaultClick 共用——共用会让两个按钮点击都增加 defaultClickCount，
// 视觉上像「多次触发」（实际上每个按钮自己仍是防抖 1 次）。
const submitClickCount = ref(0)
const submitLog = ref<string[]>([])
function onSubmitClick(): void {
  submitClickCount.value++
  submitLog.value = [
    ...submitLog.value,
    `第 ${submitClickCount.value} 次提交（${new Date().toLocaleTimeString()}）`,
  ].slice(-5)
  ElMessage.success(`submit 防抖触发（累计 ${submitClickCount.value} 次）`)
}

const tocItems = [
  { id: 'demo-default', label: '默认 500ms 防抖' },
  { id: 'demo-custom', label: '自定义 1000ms 延迟' },
  { id: 'demo-compare', label: '对比：无防抖' },
  { id: 'demo-submit', label: '实战：模拟 submit' },
  { id: 'api-binding', label: 'Binding 类型' },
]

const bindingItems = [
  {
    name: 'value',
    type: '(event: Event) => void',
    required: true,
    description: 'click 事件防抖触发后的回调',
  },
]

const argItems = [
  {
    name: 'arg',
    type: 'string',
    required: false,
    description: '可选延迟（毫秒），默认 500。用法：v-buttonDebounce:1000="onClick"',
  },
]

/* ───── code 字符串（避免 inline `<>` 触发 Vue 模板解析错误） ───────────── */

const defaultDebounceCode = `<el-button v-buttonDebounce="onSubmit">提交</el-button>`

const customDebounceCode = `<el-button v-buttonDebounce:1000="onSubmit">提交</el-button>`

const rawClickCode = `<el-button @click="onClick">无防抖</el-button>`

const submitCode = `<el-button v-buttonDebounce="handleSubmit">提交订单</el-button>`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="v-buttonDebounce 按钮防抖"
      source="src/directives/buttonDebounce.ts"
      :introductions="[
        '全局指令：click 事件防抖触发，默认 500ms（trailing edge）。',
        '适用场景：submit / 支付 / 短信发送等需要避免快速连点的按钮。',
        '与 v-inputDebounce 的差异：click 事件没有中文输入法 composition 问题，实现更简单。',
      ]"
    >
      <!-- 默认防抖 -->
      <section id="demo-default">
        <DemoField label="默认 500ms 防抖（v-buttonDebounce）" :code="defaultDebounceCode">
          <el-button v-buttonDebounce="onDefaultClick" type="primary">
            点击我（500ms 防抖）
          </el-button>
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">触发记录（仅防抖后的回调被记入）：</p>
            <p v-for="(line, idx) in defaultLog" :key="`d-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!defaultLog.length" :class="bem.e('log-empty')">（疯狂点击按钮验证）</p>
          </div>
          <p :class="bem.e('hint')">
            连续快速点击 5 次：仅最后一次（或第一次静默期结束后的那次）会被回调——共触发 1 次。
          </p>
        </DemoField>
      </section>

      <!-- 自定义延迟 -->
      <section id="demo-custom">
        <DemoField label="自定义延迟（v-buttonDebounce:1000）" :code="customDebounceCode">
          <el-button v-buttonDebounce:1000="onCustomClick" type="success">
            点击我（1000ms 防抖）
          </el-button>
          <p :class="bem.e('hint')">
            arg 语法指定 1000ms 延迟；适用于短信发送、支付等需要更长冷却期的按钮。
          </p>
        </DemoField>
      </section>

      <!-- 对比无防抖 -->
      <section id="demo-compare">
        <DemoField label="对比：无防抖" :code="rawClickCode">
          <el-button @click="onRawClick" type="warning">点击我（无防抖）</el-button>
          <p :class="bem.e('log')">
            无防抖累计触发：
            <strong>{{ rawClickCount }}</strong>
            次
          </p>
          <p :class="bem.e('hint')">
            同样连续点 5 次：回调触发 5 次——这正是 v-buttonDebounce 要避免的场景。
          </p>
        </DemoField>
      </section>

      <!-- submit 模拟 -->
      <section id="demo-submit">
        <DemoField label="实战：模拟表单提交" :code="submitCode">
          <el-button v-buttonDebounce="onSubmitClick" type="primary" :loading="false">
            提交订单（防重）
          </el-button>
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">submit 回调触发记录（独立计数）：</p>
            <p v-for="(line, idx) in submitLog" :key="`s-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!submitLog.length" :class="bem.e('log-empty')">（连点 submit 按钮验证）</p>
          </div>
          <p :class="bem.e('hint')">
            用户提交订单时多次点击同一个按钮：v-buttonDebounce 保证只有第一次（或冷却后的那次）
            会真正发起请求，避免重复扣款 / 重复创建订单等严重 bug。
          </p>
        </DemoField>
      </section>

      <!-- API 文档 -->
      <ApiTable title="Binding" :items="bindingItems" anchor="api-binding" />
      <ApiTable title="Arg（修饰参数）" :items="argItems" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-directive-button-debounce {
  &__hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
  }

  &__log {
    margin-top: 12px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    min-height: 60px;
    font-family: monospace;
    font-size: 13px;
  }

  &__log-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__log-line {
    margin: 4px 0;
    padding: 2px 6px;
    background: var(--el-bg-color);
    border-left: 3px solid var(--el-color-primary);
    border-radius: 2px;
    font-family: monospace;
    font-size: 12px;
  }

  &__log-empty {
    margin: 0;
    color: #999;
    font-style: italic;
    font-size: 12px;
  }
}
</style>
