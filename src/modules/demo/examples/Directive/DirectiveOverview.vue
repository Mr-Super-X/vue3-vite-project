<script setup lang="ts">
/**
 * 自定义指令总览 —— 6 个全局指令速查
 *
 * 全局指令统一注册于 src/directives/，由 directives/index.ts 通过 import.meta.glob
 * 自动扫描 + autoImport 注册，main.ts 中 app.use(Directives) 一行覆盖全部。
 *
 * 路由：/demo/directive-overview
 */
import DemoFrame from '../../components/DemoFrame.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-directive-overview')

interface DirectiveEntry {
  name: string
  desc: string
  route: string
  examples: string[]
}

const directives: DirectiveEntry[] = [
  {
    name: 'v-copy',
    desc: '点击复制文本到剪贴板；自动降级（clipboard API → execCommand）；ElMessage 反馈',
    route: '/demo/directive-copy',
    examples: [`v-copy="'hello'"`, `v-copy="() => row.id"`],
  },
  {
    name: 'v-draggable',
    desc: '元素拖拽（默认钳制视口边界）；为 el-dialog 头部提供专业的拖拽体验',
    route: '/demo/directive-draggable',
    examples: [`<div v-draggable>标题</div>`, `v-draggable="false"  // 禁用`],
  },
  {
    name: 'v-auth',
    desc: '权限控制（推荐）；AND / ANY / remove / disabled 修饰符；响应 store 变化',
    route: '/demo/directive-auth',
    examples: [`v-auth="'user:edit'"`, `v-auth:any="['a','b']"`, `v-auth:disabled`],
  },
  {
    name: 'v-permission',
    desc: '权限控制（兼容旧版）；仅 remove 模式，无修饰符',
    route: '/demo/directive-permission',
    examples: [`v-permission="'user:edit'"`, `v-permission="['a','b']"`],
  },
  {
    name: 'v-inputDebounce',
    desc: '输入防抖（默认 300ms）；兼容中文输入法 composition 事件',
    route: '/demo/directive-input-debounce',
    examples: [`v-inputDebounce="onInput"`, `v-inputDebounce:500="onInput"`],
  },
  {
    name: 'v-buttonDebounce',
    desc: '点击节流防重（默认 500ms）；用于按钮快速连点场景',
    route: '/demo/directive-button-debounce',
    examples: [`v-buttonDebounce="onClick"`, `v-buttonDebounce:1000="onClick"`],
  },
]

const tocItems = [
  { id: 'overview-table', label: '指令速查' },
  { id: 'overview-usage', label: '使用约定' },
  { id: 'overview-architecture', label: '注册机制' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="自定义指令总览"
      source="src/directives/"
      :introductions="[
        '全局指令位于 src/directives/，由 directives/index.ts 通过 import.meta.glob 自动扫描注册，main.ts 中 app.use(Directives) 一行覆盖。',
        '本分组共 6 个指令：v-copy / v-draggable / v-auth / v-permission / v-inputDebounce / v-buttonDebounce。',
        '所有指令以 install 模式 default export，类型声明与 .d.ts 分离（参考 inputDebounce / buttonDebounce / draggable 范式）。',
      ]"
    >
      <!-- 速查表 -->
      <section id="overview-table">
        <el-table :data="directives" border :class="bem.e('table')">
          <el-table-column prop="name" label="指令" width="180" />
          <el-table-column prop="desc" label="说明" min-width="280" />
          <el-table-column label="用法示例" min-width="240">
            <template #default="{ row }">
              <code v-for="ex in (row as DirectiveEntry).examples" :key="ex" :class="bem.e('code')">
                {{ ex }}
              </code>
            </template>
          </el-table-column>
          <el-table-column label="查看" width="100" align="center">
            <template #default="{ row }">
              <el-link :href="(row as DirectiveEntry).route" type="primary">→ Demo</el-link>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 使用约定 -->
      <section id="overview-usage">
        <h3 :class="bem.e('heading')">使用约定</h3>
        <ul :class="bem.e('list')">
          <li>
            <strong>JS 自动可用：</strong>
            指令无需 import，在任何 .vue 模板中直接
            <code>v-xxx</code>
            即可（注册由 directives/index.ts 自动完成）。
          </li>
          <li>
            <strong>类型安全：</strong>
            每个指令配套 .d.ts 文件，IDE hover 时显示完整类型签名。
          </li>
          <li>
            <strong>生命周期：</strong>
            所有指令遵循 Vue 3 标准三钩子（mounted / updated / unmounted），状态用 WeakMap
            持有避免污染 DOM 类型。
          </li>
          <li>
            <strong>新增指令：</strong>
            只需在 src/directives/ 下添加
            <code>v-xxx.ts</code>
            +
            <code>v-xxx.d.ts</code>
            ，路由 / sidebar / main.ts 均无需改动。
          </li>
        </ul>
      </section>

      <!-- 注册机制 -->
      <section id="overview-architecture">
        <h3 :class="bem.e('heading')">注册机制</h3>
        <ol :class="bem.e('list')">
          <li>
            <code>src/directives/index.ts</code>
            用
            <code>import.meta.glob(['./*.ts', ...])</code>
            扫描本目录所有指令文件。
          </li>
          <li>
            排除规则：
            <code>*.d.ts</code>
            （类型）/
            <code>*.spec.ts</code>
            （单测，会触发 vi.mock 运行时崩溃）/
            <code>_*</code>
            （内部工具）/
            <code>index.ts</code>
            自身。
          </li>
          <li>
            每个被扫到的模块调用
            <code>app.directive('xxx', ...)</code>
            ，指令名与文件名 v- 前缀后部分一致。
          </li>
          <li>
            <code>src/main.ts</code>
            通过
            <code>app.use(Directives)</code>
            一行注册全部。
          </li>
        </ol>
      </section>
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-directive-overview {
  &__heading {
    margin: 24px 0 12px;
    font-size: 16px;
    font-weight: 600;
  }

  &__list {
    margin: 0 0 12px 20px;
    line-height: 1.8;
    color: var(--el-text-color-regular);
  }

  &__table {
    margin-bottom: 16px;

    code {
      font-family: monospace;
      font-size: 12px;
    }
  }

  &__code {
    display: block;
    padding: 2px 6px;
    margin: 2px 0;
    background: var(--el-fill-color-light);
    border-radius: 3px;
    font-family: monospace;
    font-size: 12px;
  }
}
</style>
