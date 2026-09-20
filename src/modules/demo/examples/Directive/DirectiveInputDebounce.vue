<script setup lang="ts">
/**
 * v-inputDebounce 指令演示 —— 输入防抖 + 中文输入法兼容
 *
 * 覆盖场景：
 *  - 搜索框实时防抖（默认 300ms）
 *  - 自定义延迟（arg 语法：v-inputDebounce:500）
 *  - 中文输入法 compositionstart/end 处理：拼音阶段不触发回调，组合结束才触发一次
 *
 * 路由：/demo/directive-input-debounce
 */
import { ref } from 'vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-directive-input-debounce')

/* ───── 演示数据 ───────────── */

// 默认 300ms 防抖
// v-inputDebounce 回调签名是 (event: Event) => void（与原生 input listener 一致），
// 不是 (value: string) — 这是 demo 之前签名错误的根因，调用方需自己从 event.target 取值
const searchDefault = ref('')
const defaultLog = ref<string[]>([])
function onSearchDefault(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  // 防抖触发后才进 log
  defaultLog.value = [...defaultLog.value, `防抖触发：${value}`].slice(-5)
}

// 自定义 500ms 防抖（arg 语法）
const searchCustom = ref('')
const customLog = ref<string[]>([])
function onSearchCustom(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  customLog.value = [...customLog.value, `500ms 防抖触发：${value}`].slice(-5)
}

// 中文输入法：独立 ref + 独立回调 + 独立日志（与默认防抖示例隔离，
// 否则两个 input 双向同步 v-model 且回调日志会相互覆盖，演示效果失真）
const searchComposition = ref('')
const compositionLog = ref<string[]>([])
function onSearchComposition(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  compositionLog.value = [...compositionLog.value, `组合结束触发：${value}`].slice(-5)
}

// 实时（无防抖）对比——直接接受 EP el-input @input 的字符串参数，
// 不走 v-inputDebounce 指令（无防抖需求），签名与防抖路径区分开
const searchRaw = ref('')
const rawLog = ref<string[]>([])
function onSearchRaw(value: string): void {
  rawLog.value = [...rawLog.value, `实时触发：${value}`].slice(-8)
}

const tocItems = [
  { id: 'demo-default', label: '默认 300ms 防抖' },
  { id: 'demo-custom', label: '自定义延迟' },
  { id: 'demo-compare', label: '对比：无防抖' },
  { id: 'demo-composition', label: '中文输入法处理' },
  { id: 'api-binding', label: 'Binding 类型' },
]

const bindingItems = [
  {
    name: 'value',
    type: '(event: Event) => void',
    required: true,
    description: 'input 事件防抖触发后的回调，签名同原生 input listener',
  },
]

const argItems = [
  {
    name: 'arg',
    type: 'string',
    required: false,
    description: '可选延迟（毫秒），默认 300。用法：v-inputDebounce:500="onInput"',
  },
]

/* ───── code 字符串（避免 inline `<>` 触发 Vue 模板解析错误） ───────────── */

const defaultDebounceCode = `<el-input v-inputDebounce="onSearch" v-model="keyword" />`

const customDebounceCode = `<el-input v-inputDebounce:500="onSearch" v-model="keyword" />`

const rawInputCode = `<el-input @input="onRawInput" v-model="raw" />`

const compositionCode = `<el-input v-inputDebounce="onSearch" v-model="keyword" />
// 内部：compositionstart → composing=true 跳过回调
//       compositionend  → composing=false 主动 dispatch input 触发一次回调`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="v-inputDebounce 输入防抖"
      source="src/directives/inputDebounce.ts"
      :introductions="[
        '全局指令：input 事件防抖触发，默认 300ms。通过 arg 自定义延迟（如 :500 / :1000）。',
        '中文输入法支持：compositionstart/end 标记 composing 状态，拼音阶段不触发回调，组合结束后再统一触发一次。',
        '兼容封装组件：通过 BFS 查找子 INPUT 元素（Element Plus el-input 等）。',
      ]"
    >
      <!-- 默认防抖 -->
      <section id="demo-default">
        <DemoField label="默认 300ms 防抖（v-inputDebounce）" :code="defaultDebounceCode">
          <el-input
            v-inputDebounce="onSearchDefault"
            v-model="searchDefault"
            placeholder="尝试连续输入字符，观察日志"
            clearable
          />
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">回调日志（防抖后）：</p>
            <p v-for="(line, idx) in defaultLog" :key="`d-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!defaultLog.length" :class="bem.e('log-empty')">（输入字符触发防抖回调）</p>
          </div>
        </DemoField>
      </section>

      <!-- 自定义延迟 -->
      <section id="demo-custom">
        <DemoField label="自定义延迟（v-inputDebounce:500）" :code="customDebounceCode">
          <el-input
            v-inputDebounce:500="onSearchCustom"
            v-model="searchCustom"
            placeholder="500ms 防抖间隔"
            clearable
          />
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">回调日志（500ms 防抖）：</p>
            <p v-for="(line, idx) in customLog" :key="`c-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!customLog.length" :class="bem.e('log-empty')">
              （输入字符触发 500ms 防抖回调）
            </p>
          </div>
        </DemoField>
      </section>

      <!-- 对比无防抖 -->
      <section id="demo-compare">
        <DemoField label="对比：实时（无防抖）" :code="rawInputCode">
          <el-input
            :model-value="searchRaw"
            placeholder="无防抖，每次按键都触发回调"
            clearable
            @input="
              (v: string) => {
                searchRaw = v
                onSearchRaw(v)
              }
            "
          />
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">实时回调日志：</p>
            <p v-for="(line, idx) in rawLog" :key="`r-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!rawLog.length" :class="bem.e('log-empty')">（输入字符实时回调）</p>
          </div>
          <p :class="bem.e('hint')">
            同样输入「hello world」共 11 字符 → 实时触发 11 次回调（每次按键 1 次），
            而上方防抖后只触发 1 次。防抖显著降低搜索请求频率。
          </p>
        </DemoField>
      </section>

      <!-- 中文输入法 -->
      <section id="demo-composition">
        <DemoField label="中文输入法兼容（拼音阶段不触发）" :code="compositionCode">
          <el-input
            v-inputDebounce="onSearchComposition"
            v-model="searchComposition"
            placeholder="输入拼音（如 zhongwen），拼音阶段不触发回调，组合完成才触发一次"
            clearable
          />
          <div :class="bem.e('log')">
            <p :class="bem.e('log-title')">组合结束回调日志：</p>
            <p v-for="(line, idx) in compositionLog" :key="`cmp-${idx}`" :class="bem.e('log-line')">
              {{ line }}
            </p>
            <p v-if="!compositionLog.length" :class="bem.e('log-empty')">
              （打开中文输入法，输入拼音——只有汉字上屏才进日志）
            </p>
          </div>
          <p :class="bem.e('hint')">
            验证方法：把中文输入法打开，输入「zhongwen」——拼音过程不会触发回调日志，
            汉字上屏（composing 结束）才触发一次。这是 v-inputDebounce 与原生 input 防抖的关键差异。
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
.#{$BEM_PREFIX}-demo-directive-input-debounce {
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
    min-height: 80px;
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
