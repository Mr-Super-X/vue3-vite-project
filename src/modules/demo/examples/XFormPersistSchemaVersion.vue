<script setup lang="ts">
/**
 * 演示 useFormPersist.restoreFilter —— schema 升级后裁剪旧草稿
 *
 * 场景：用户填写一半的问卷草稿
 *   1. v1 schema: 字段 a / b / oldField（已废弃）
 *   2. 模拟用户填到一半保存草稿
 *   3. 切到 v2 schema: 移除 oldField，新增 c（恢复时字段映射）
 *   4. 加载草稿时 restoreFilter 裁剪旧字段
 */
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useFormPersist } from '@/components/form-schema'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { persistItems } from './xform-demos-api'
import xFormSource from './XFormPersistSchemaVersion.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, copySchema } = useXFormDemo({
  name: 'persist-schema-version',
  schema: () => schema.value,
})

const model = reactive<Record<string, unknown>>({
  a: '',
  b: '',
})

// —— 草稿持久化：restoreFilter 处理 schema 升级裁剪 ——
// 真实场景：v1 → v2 时字段重命名/移除。restoreFilter 在 load 时裁剪旧字段。
const persist = useFormPersist({
  key: 'demo.xform-persist-schema-version.draft',
  model,
  debounce: 300,
  restoreFilter: (draft: Record<string, unknown>) => {
    // v2 schema 不再需要 oldField；c 是 v2 新增字段（默认值）
    const { oldField, ...rest } = draft
    if (oldField) {
      console.info('[restoreFilter] 已裁剪废弃字段 oldField:', oldField)
    }
    return { ...rest, c: 'v2-default' }
  },
})

// —— 模拟 schema 升级 ——
type Version = 'v1' | 'v2'
const version = ref<Version>('v1')

const schema = ref<SchemaNode>(buildV1Schema())

function buildV1Schema(): SchemaNode {
  return {
    column: 1,
    children: [
      {
        label: '字段 a',
        name: 'a',
        component: 'Input',
        props: { placeholder: 'a', clearable: true },
      },
      {
        label: '字段 b',
        name: 'b',
        component: 'Input',
        props: { placeholder: 'b', clearable: true },
      },
      {
        label: '废弃字段（v1 → v2 移除）',
        name: 'oldField',
        component: 'Input',
        props: { placeholder: 'v1 字段，restoreFilter 会裁剪', clearable: true },
      },
    ],
  }
}

function buildV2Schema(): SchemaNode {
  return {
    column: 1,
    children: [
      {
        label: '字段 a',
        name: 'a',
        component: 'Input',
        props: { placeholder: 'a（保留）', clearable: true },
      },
      {
        label: '字段 b',
        name: 'b',
        component: 'Input',
        props: { placeholder: 'b（保留）', clearable: true },
      },
      // v2 新增字段 c
      {
        label: '字段 c（v2 新增）',
        name: 'c',
        component: 'Input',
        props: { placeholder: 'v2 默认值由 restoreFilter 注入', clearable: true },
      },
    ],
  }
}

function switchVersion(v: Version): void {
  version.value = v
  schema.value = v === 'v1' ? buildV1Schema() : buildV2Schema()
  // ⭐ 切版本时的关键时序（最终版）：
  // 1. Object.assign 清空 model —— 触发 watch 调度 debounceWrite(300ms)
  // 2. 必须用 nextTick 等待 watch 同步触发完毕（Vue watch 是微任务异步）
  //    否则同步调 cancelPendingSave 取消不到还没创建的 debounce 实例
  // 3. nextTick 后 cancelPendingSave() 真正取消该 debounce → localStorage 保留 v1 草稿
  // 4. 切后点「加载草稿」时 restoreFilter 裁剪 oldField + 注入 c=v2-default
  Object.assign(model, { a: '', b: '', oldField: '', c: '' })
  void nextTick(() => {
    persist.cancelPendingSave()
  })
  ElMessage.info(`已切换到 ${v.toUpperCase()} schema`)
}

function onSaveDraft(): void {
  persist.save()
  ElMessage.success('草稿已手动落盘（也可等 debounce 300ms 自动保存）')
}

function onLoadDraft(): void {
  if (!persist.hasDraft.value) {
    ElMessage.warning('当前没有草稿（先填字段再点"保存草稿"）')
    return
  }
  persist.load()
  formRef.value?.resetDirty()
  ElMessage.success(`草稿已恢复（当前 ${version.value}）`)
}

function onClearDraft(): void {
  // 先重置 model（会触发 watch 重新调度 debounce）+ 立刻 cancel pending
  // 再调 persist.clear()（删 localStorage + 重置 hasDraft/lastSavedAt）
  // 顺序敏感：若先 clear 后 assign，watch 重新写入空草稿让 hasDraftOrSaved 误显示「存在」
  Object.assign(model, { a: '', b: '', oldField: '', c: '' })
  persist.clear()
  ElMessage.success('草稿已清除')
}

onMounted(() => {
  if (persist.hasDraft.value) {
    ElMessage.info('检测到草稿，点"加载草稿"恢复')
  }
})

const tocItems = [
  { id: 'demo-persist-schema-version', label: 'restoreFilter 演示' },
  { id: 'api-persist-schema-version', label: 'useFormPersist 配置速查' },
]

/**
 * 草稿存在标志（修正 useFormPersist 引擎 bug）：
 * - persist.hasDraft 仅在初始化时根据 localStorage 存在性计算，save 后不自动更新
 * - persist.lastSavedAt 在每次 save 后更新（Date.now()）
 * 综合两者：hasDraft（初始 localStorage 有 key）或 lastSavedAt !== null（本次会话 save 过）
 */
const hasDraftOrSaved = computed(() => persist.hasDraft.value || persist.lastSavedAt.value !== null)
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="useFormPersist.restoreFilter —— schema 升级后裁剪旧草稿"
      source="src/components/form-schema/composables/use-form-persist.ts"
      :introductions="[
        'schema 升级时字段会重命名 / 移除 / 新增；restoreFilter 在 load() 时裁剪旧字段 + 注入新字段默认值',
        '应用场景：表单配置随业务迭代，存量用户草稿不能因为字段变更就丢',
        '测试步骤：',
        '  ① v1 模式下填字段 a=hello、b=world、oldField=legacy → 点「保存草稿」',
        '  ② 切到 v2 → 点「加载草稿」 → a/b 保留，oldField 被裁剪，c=v2-default',
        '  ③ 控制台看 [restoreFilter] 已裁剪废弃字段 oldField: legacy',
      ]"
    >
      <section id="demo-persist-schema-version">
        <div :class="bem.e('controls')">
          <span>schema 版本：</span>
          <el-radio-group
            v-model="version"
            @change="(v: string | number | boolean | undefined) => switchVersion(v as Version)"
          >
            <el-radio-button value="v1">v1（含 oldField）</el-radio-button>
            <el-radio-button value="v2">v2（移除 oldField，新增 c）</el-radio-button>
          </el-radio-group>
          <el-button @click="onSaveDraft">保存草稿</el-button>
          <el-button @click="onLoadDraft" :disabled="!hasDraftOrSaved">加载草稿</el-button>
          <el-button @click="onClearDraft">清除草稿</el-button>
          <el-button @click="copySchema">复制 schema</el-button>
          <span :class="bem.e('hint')">
            草稿状态：
            <strong>{{ hasDraftOrSaved ? '存在' : '无' }}</strong>
          </span>
        </div>

        <DemoField label="schema 版本切换 + 草稿裁剪" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="useFormPersist 配置速查"
        :items="persistItems"
        anchor="api-persist-schema-version"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-persist-schema-version {
  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    flex-wrap: wrap;
    font-size: 13px;
  }

  &__hint {
    margin-left: auto;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    strong {
      color: var(--el-color-warning);
    }
  }
}
</style>
